import rootMutations from './root';

import { fieldResolvers as helpFields } from './help';
import { fieldResolvers as helpPostFields } from './helpPost';
import { fieldResolvers as helpPostsFields } from './helpPosts';
import { fieldResolvers as helpPostCommentsFields } from './helpPostComments';
import { fieldResolvers as helpPostCommentFields } from './helpPostComment';

export default {
  ...rootMutations,
};

export const fieldResolvers = {
  ...helpFields,
  ...helpPostFields,
  ...helpPostsFields,
  ...helpPostCommentsFields,
  ...helpPostCommentFields,
};
