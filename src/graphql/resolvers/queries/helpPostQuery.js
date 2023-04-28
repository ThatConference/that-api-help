import debug from 'debug';
import helpPostStore from '../../../dataSources/cloudFirestore/helpPost';
import helpPostCommentStore from '../../../dataSources/cloudFirestore/helpPostComment';

const dlog = debug('that:api:help:query:helpPostQuey');

export const fieldResolvers = {
  HelpPostQuery: {
    get: ({ postId }, __, { dataSources: { firestore } }) => {
      dlog('get post: %s', postId);
      return helpPostStore(firestore).get(postId);
    },
    comments: (
      { postId },
      { pageSize, cursor },
      { dataSources: { firestore } },
    ) => {
      dlog('get comments for post: %s', postId);
      return helpPostCommentStore(firestore).findAllForPostPaged({
        helpPostId: postId,
        pageSize,
        cursor,
      });
    },
  },
};
