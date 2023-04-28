import debug from 'debug';
import { dataSources } from '@thatconference/api';

const dlog = debug('that:api:help:query:helpPost');
const memberStore = dataSources.cloudFirestore.member;

export const fieldResolvers = {
  HelpQuery: {
    posts: () => ({}),
    me: (_, __, { dataSoruces: { firestore }, user }) => {
      dlog('me help path for %o', user);
      return memberStore(firestore)
        .get(user.sub)
        .then(member => ({
          memberId: member.id,
          profileSlug: member.profileSlug,
        }));
    },
  },
};
