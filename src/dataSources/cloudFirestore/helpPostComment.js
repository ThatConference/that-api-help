import debug from 'debug';
import * as Sentry from '@sentry/node';
import { utility } from '@thatconference/api';

const dlog = debug('that:api:help:datasources:firebase:helpPost');
const collectionName = 'helpPosts';
const subCollectionName = 'comments';
const { entityDateForge } = utility.firestoreDateForge;
const fields = ['createdAt', 'lastUpdatedAt'];
const helpPostCommentDateForge = entityDateForge({ fields });

const scrubHelpPostComment = ({ comment, isNew = false, memberId }) => {
  dlog('scrubHelpPost called');
  const scrubbedHelpPostComment = comment;
  const now = new Date();
  if (isNew) {
    scrubbedHelpPostComment.createdAt = now;
    scrubbedHelpPostComment.createdBy = memberId;
  }
  scrubbedHelpPostComment.lastUpdatedAt = now;

  return scrubbedHelpPostComment;
};

function isValidDate(d) {
  // eslint-disable-next-line no-restricted-globals
  return d instanceof Date && !isNaN(d);
}

const helpPostComment = dbInstance => {
  dlog('instantiate helpPostComment datasource instance');

  const helpPostCol = dbInstance.collection(collectionName);
  // const helpPostCommentCol = dbInstance.collection(subCollectionName);

  function get({ helpPostId, commentId }) {
    dlog('get comment %s, %s', helpPostId, commentId);
    return helpPostCol
      .doc(helpPostId)
      .collection(subCollectionName)
      .doc(commentId)
      .get()
      .then(doc => {
        let result = null;
        if (doc.exists) {
          result = {
            id: doc.id,
            ...doc.data(),
          };
          result = helpPostCommentDateForge(result);
        }

        return result;
      });
  }

  async function findAllForPostPaged({ helpPostId, pageSize = 20, cursor }) {
    dlog('find all comments for post %d, page: %d', helpPostId, pageSize);
    let query = helpPostCol
      .doc(helpPostId)
      .collection(subCollectionName)
      .orderBy('createdAt', 'desc')
      .limit(pageSize);

    if (cursor) {
      const cursorObject = Buffer.from(cursor, 'base64').toString('utf8');
      dlog('🚰 cursorObject %o', cursorObject);
      let curCreatedAt;
      try {
        ({ curCreatedAt } = JSON.parse(cursorObject));
      } catch (err) {
        Sentry.setTags({
          rawCursor: cursor,
          cursor: cursorObject,
        });
        const sentryId = Sentry.captureException(err);
        throw new Error('Invalid cursor provided (%d)', sentryId);
      }

      const startAfterDate = new Date(curCreatedAt);
      if (!isValidDate(startAfterDate)) {
        Sentry.setTags({
          rawCursor: cursor,
          cursor: cursorObject,
        });
        throw new Error('Invalid cursor provided (date)');
      }
      query = query.startAfter(startAfterDate);
    }
    const { size, docs } = await query.get();
    dlog('found %d helpPost records', size);

    const comments = docs.map(doc => {
      const r = {
        id: doc.id,
        ...doc.data(),
      };
      return helpPostCommentDateForge(r);
    });

    const lastComment = comments[comments.length - 1];
    let newCursor = '';
    if (lastComment && comments.length >= pageSize) {
      dlog('lastComment:: %o', lastComment);
      // one millisecond needs to be removed from descending timestamp paging
      const curCreatedAt = new Date(lastComment.createdAt.getTime() - 1);
      const cpieces = JSON.stringify({ curCreatedAt });
      newCursor = Buffer.from(cpieces, 'utf8').toString('base64');
    }

    return {
      comments,
      cursor: newCursor,
      count: comments.length,
    };
  }

  function create({ postId, newComment, memberId }) {
    dlog('create new comment on post %s by member %s', postId, memberId);
    const cleanComment = scrubHelpPostComment({
      comment: newComment,
      isNew: true,
      memberId,
    });
    cleanComment.helpPostId = postId;
    cleanComment.helpPostRef = helpPostCol.doc(postId);
    return helpPostCol
      .doc(postId)
      .collection(subCollectionName)
      .add(cleanComment)
      .then(docRef => get({ helpPostId: postId, commentId: docRef.id }));
  }

  async function update({ postId, commentId, updateComment, memberId }) {
    dlog('updating comment %s, on post %s, by %s', commentId, postId, memberId);
    const cleanComment = scrubHelpPostComment({
      comment: updateComment,
      isNew: false,
    });
    const check = await get({ helpPostId: postId, commentId });
    if (check.createdBy !== memberId) {
      Sentry.setContext('helpPostComment', { ...check });
      throw new Error('Requested post comment update not found for user');
    }
    const docRef = helpPostCol
      .doc(postId)
      .collection(subCollectionName)
      .doc(commentId);
    return docRef
      .update(cleanComment)
      .then(() => get({ helpPostId: postId, commentId }));
  }

  return {
    get,
    findAllForPostPaged,
    create,
    update,
  };
};

export default helpPostComment;
