import debug from 'debug';
import helpPostStore from '../../../dataSources/cloudFirestore/helpPost';
import helpPostCommentStore from '../../../dataSources/cloudFirestore/helpPostComment';

const dlog = debug('that:api:help:query:meHelpPost');

export const fieldResolvers = {
  MeHelpQuery: {
    posts: (
      { memberId },
      { pageSize, cursor },
      { dataSources: { firestore } },
    ) => {
      dlog('Me Help Posts query. Page Size: %d', pageSize);
      return helpPostStore(firestore).getByMemberPaged({
        pageSize,
        cursor,
        memberId,
      });
    },
    comments: (
      { memberId },
      { pageSize, cursor },
      { dataSources: { firestore } },
    ) => {
      dlog('me all help post comment query. page size: %d', pageSize);
      return helpPostCommentStore(firestore).findAllCommentsForMember({
        memberId,
        pageSize,
        cursor,
      });
    },
  },
};
