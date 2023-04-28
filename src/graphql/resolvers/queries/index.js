import root from './root';

import { fieldResolvers as helpFields } from './help';
import { fieldResolvers as helpPostFields } from './helpPost';
import { fieldResolvers as helpPostsFields } from './helpPosts';
import { fieldResolvers as meHelpFields } from './meHelp';
import { fieldResolvers as helpPostCommentFields } from './helpPostComment';

export default {
  ...root,
};

export const fieldResolvers = {
  ...helpFields,
  ...helpPostFields,
  ...helpPostsFields,
  ...meHelpFields,
  ...helpPostCommentFields,
};
