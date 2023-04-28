import debug from 'debug';
import helpPostStore from '../../../dataSources/cloudFirestore/helpPost';

const dlog = debug('that:api:help:mutation:helpPost');

export const fieldResolvers = {
  HelpPostMutation: {
    update: (
      { postId },
      { helpPost },
      { dataSources: { firestore }, user },
    ) => {
      dlog('%s updating helpPost %s, %o', user.sub, postId, helpPost);

      return helpPostStore(firestore).update({
        postId,
        updateHelpPost: helpPost,
        memberId: user.sub,
      });
    },
    comments: ({ postId }) => ({ postId }),
  },
};
