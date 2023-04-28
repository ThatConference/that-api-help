import debug from 'debug';

const dlog = debug('that:api:help:query:helpComment');

export const fieldResolvers = {
  HelpPostComment: {
    createdBy: ({ createdBy: id }) => ({ id }),
    isFlagged: ({ isFlagged }) => isFlagged ?? false,
    helpPost: ({ helpPostId }, __, { dataSources: { helpPostLoader } }) => {
      dlog('fetching helpPost %s', helpPostId);
      return helpPostLoader.load(helpPostId);
    },
  },
};
