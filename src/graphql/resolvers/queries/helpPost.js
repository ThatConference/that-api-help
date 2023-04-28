import helpPostCommentStore from '../../../dataSources/cloudFirestore/helpPostComment';

export const fieldResolvers = {
  HelpPost: {
    createdBy: ({ createdBy: id }) => ({ id }),
    isFlagged: ({ isFlagged }) => isFlagged ?? false,
    tags: ({ tags }) => tags ?? [],
    status: ({ status }) => status ?? 'HIDDEN',
    comments: (
      { id: helpPostId },
      { pageSize = 20, cursor },
      { dataSources: { firestore } },
    ) =>
      helpPostCommentStore(firestore).findAllForPostPaged({
        helpPostId,
        pageSize,
        cursor,
      }),
  },
};
