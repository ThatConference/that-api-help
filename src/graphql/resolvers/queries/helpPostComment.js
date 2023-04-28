import debug from 'debug';
import helpPostStore from '../../../dataSources/cloudFirestore/helpPost';

const dlog = debug('that:api:help:query:helpComment');

export const fieldResolvers = {
  HelpPostComment: {
    createdBy: ({ createdBy: id }) => ({ id }),
    isFlagged: ({ isFlagged }) => isFlagged ?? false,
    helpPost: ({ helpPostId }, __, { dataSources: { firestore } }) => {
      dlog('fetching helpPost %s', helpPostId);
      return helpPostStore(firestore).get(helpPostId);
    },
  },
};
