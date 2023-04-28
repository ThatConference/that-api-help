import debug from 'debug';
import helpPostStore from '../../../dataSources/cloudFirestore/helpPost';

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
  },
};
