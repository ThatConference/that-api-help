import debug from 'debug';
import * as Sentry from '@sentry/node';
import { utility } from '@thatconference/api';

const dlog = debug('that:api:help:datasources:firebase:helpPost');
const collectionName = 'helpPosts';
const { entityDateForge } = utility.firestoreDateForge;
const fields = ['createdAt', 'lastUpdatedAt'];
const helpPostDateForge = entityDateForge({ fields });

const scrubHelpPost = ({ helpPost, isNew = false, memberId }) => {
  dlog('scrubHelpPost called');
  const scrubbedHelpPost = helpPost;
  const now = new Date();
  if (isNew) {
    scrubbedHelpPost.createdAt = now;
    scrubbedHelpPost.createdBy = memberId;
  }
  scrubbedHelpPost.lastUpdatedAt = now;

  return scrubbedHelpPost;
};

function isValidDate(d) {
  // eslint-disable-next-line no-restricted-globals
  return d instanceof Date && !isNaN(d);
}

const helpPost = dbInstance => {
  dlog('instantiate helpPost datasource instance');
  const helpPostCol = dbInstance.collection(collectionName);

  function get(id) {
    dlog('get: %s', id);
    return helpPostCol
      .doc(id)
      .get()
      .then(doc => {
        let result = null;
        if (doc.exists) {
          result = {
            id: doc.id,
            ...doc.data(),
          };
          result = helpPostDateForge(result);
        }

        return result;
      });
  }

  async function getAllPaged({ pageSize = 20, cursor }) {
    dlog('getAllPaged called. PageSize: %d', pageSize);
    let query = helpPostCol.orderBy('lastUpdatedAt', 'desc').limit(pageSize);

    if (cursor) {
      const cursorObject = Buffer.from(cursor, 'base64').toString('utf8');
      dlog('🚰 cursorObject %o', cursorObject);
      let curLastUpdatedAt;
      try {
        ({ curLastUpdatedAt } = JSON.parse(cursorObject));
      } catch (err) {
        Sentry.setTags({
          rawCursor: cursor,
          cursor: cursorObject,
        });
        const sentryId = Sentry.captureException(err);
        throw new Error('Invalid cursor provided (%d)', sentryId);
      }

      const startAfterDate = new Date(curLastUpdatedAt);
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

    const posts = docs.map(doc => {
      const r = {
        id: doc.id,
        ...doc.data(),
      };
      return helpPostDateForge(r);
    });

    const lastPost = posts[posts.length - 1];
    let newCursor = '';
    if (lastPost) {
      dlog('lastPost:: %o', lastPost);
      // one millisecond needs to be removed from descending timestamp paging
      const curLastUpdatedAt = new Date(lastPost.lastUpdatedAt.getTime() - 1);
      const cpieces = JSON.stringify({ curLastUpdatedAt });
      newCursor = Buffer.from(cpieces, 'utf8').toString('base64');
    }

    return {
      posts,
      cursor: newCursor,
      count: posts.length,
    };
  }

  async function getByMemberPaged({ pageSize = 20, cursor, memberId }) {
    dlog('getByMemberPaged %d', memberId);
    // where() fn must come before startAfter()/startAt()
    let query = helpPostCol
      .orderBy('createdAt', 'desc')
      .limit(pageSize)
      .where('createdBy', '==', memberId);

    if (cursor) {
      const cursorObject = Buffer.from(cursor, 'base64').toString('utf8');
      dlog('🚰 cursorObject %o', cursorObject);
      let curCreatedAt;
      let curMember;
      try {
        ({ curCreatedAt, curMember } = JSON.parse(cursorObject));
      } catch (err) {
        Sentry.setTags({
          rawCursor: cursor,
          cursor: cursorObject,
          memberId,
        });
        const sentryId = Sentry.captureException(err);
        throw new Error('Invalid cursor provided (%d)', sentryId);
      }
      if (curMember !== memberId)
        throw new Error('Invalid cursor provided (mid)');

      const startAfterDate = new Date(curCreatedAt);
      if (!isValidDate(startAfterDate)) {
        Sentry.setTags({
          rawCursor: cursor,
          cursor: cursorObject,
          memberId,
        });
        throw new Error('Invalid cursor provided (date)');
      }
      query = query.startAfter(startAfterDate);
    }
    const { size, docs } = await query.get();
    dlog('found %d member helpPosts', size);

    const posts = docs.map(doc => {
      const r = {
        id: doc.id,
        ...doc.data(),
      };

      return helpPostDateForge(r);
    });

    const lastPost = posts[posts.length - 1];
    let newCursor = '';
    if (lastPost) {
      dlog('lastPost:: %o', lastPost);
      const curCreatedAt = new Date(lastPost.createdAt);
      const cpieces = JSON.stringify({ curCreatedAt, curMember: memberId });
      newCursor = Buffer.from(cpieces, 'utf8').toString('base64');
    }

    return {
      posts,
      cursor: newCursor,
      count: posts.length,
    };
  }

  function batchFindHelpPosts(postIds) {
    dlog('batchFindHelpPosts called on %d ids', postIds?.length);
    if (!Array.isArray(postIds))
      throw new Error('batchFindHelpPosts parameter must be an array');

    const docRefs = postIds.map(id => helpPostCol.doc(id));
    if (docRefs.length < 1) return [];

    return dbInstance.getAll(...docRefs).then(docSnaps =>
      docSnaps.map(r => {
        let result = null;
        if (r.exists) {
          result = {
            id: r.id,
            ...r.data(),
          };
        }

        return helpPostDateForge(result);
      }),
    );
  }

  function create({ newHelpPost, memberId }) {
    dlog('create new post by %d', memberId);
    const scrubbedHelpPost = scrubHelpPost({
      helpPost: newHelpPost,
      isNew: true,
      memberId,
    });

    return helpPostCol.add(scrubbedHelpPost).then(newDoc => get(newDoc.id));
  }

  async function update({ postId, updateHelpPost, memberId }) {
    dlog('update help post %s, %o', postId, updateHelpPost);
    const scrubbedHelpPost = scrubHelpPost({
      helpPost: updateHelpPost,
      isNew: false,
      memberId,
    });
    const check = await get(postId);

    if (check.createdBy !== memberId) {
      Sentry.setContext('helpPost', { ...check });
      throw new Error('Requested post update not found for user');
    }
    const docRef = helpPostCol.doc(postId);
    return docRef.update(scrubbedHelpPost).then(() => get(postId));
  }

  return {
    get,
    getAllPaged,
    getByMemberPaged,
    batchFindHelpPosts,
    create,
    update,
  };
};

export default helpPost;
