import debug from 'debug';
import helpPostCommentStore from '../../../dataSources/cloudFirestore/helpPostComment';

const dlog = debug('that:api:help:mutation:helpPost:comment');

export const fieldResolvers = {
  HelpPostCommentsMutation: {
    comment: ({ postId }, { commentId }) => ({ postId, commentId }),
    create: ({ postId }, { comment }, { dataSources: { firestore }, user }) => {
      dlog('created comment on postId: %s', postId);
      return helpPostCommentStore(firestore).create({
        postId,
        newComment: comment,
        memberId: user.sub,
      });
    },
  },
};
