import debug from 'debug';
import helpPostStore from '../../../dataSources/cloudFirestore/helpPost';

const dlog = debug('that:api:help:query:helpPosts');

export const fieldResolvers = {
  HelpPostsQuery: {
    all: (_, { cursor, pageSize = 30 }, { dataSources: { firestore } }) => {
      dlog('query all posts with pagesize of %d', pageSize);
      return helpPostStore(firestore).getAllPaged({ pageSize, cursor });
    },
    post: (_, { postId }) => {
      dlog('scope to post: %s', postId);
      return { postId };
    },
  },
};
