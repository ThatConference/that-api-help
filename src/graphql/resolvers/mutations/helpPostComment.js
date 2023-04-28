import debug from 'debug';
import helpPostCommentStore from '../../../dataSources/cloudFirestore/helpPostComment';

const dlog = debug('that:api:help:mutation:helpPost:comment');

export const fieldResolvers = {
  HelpPostCommentMutation: {
    update: (
      { postId, commentId },
      { comment },
      { dataSources: { firestore }, user },
    ) => {
      dlog('update post %s, comment %s, by %s', postId, commentId, user.sub);
      return helpPostCommentStore(firestore).update({
        postId,
        commentId,
        updateComment: comment,
        memberId: user.sub,
      });
    },
  },
};
