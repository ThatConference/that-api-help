import debug from 'debug';
import helpPostStore from '../../../dataSources/cloudFirestore/helpPost';

const dlog = debug('that:api:help:mutation:helpPosts');

export const fieldResolvers = {
  HelpPostsMutation: {
    helpPost: (_, { postId }) => ({ postId }),
    create: (
      _,
      { helpPost: newHelpPost },
      { dataSources: { firestore }, user },
    ) => {
      dlog('create helpPost: %o', newHelpPost);
      return helpPostStore(firestore).create({
        newHelpPost,
        memberId: user.sub,
      });
    },
  },
};
