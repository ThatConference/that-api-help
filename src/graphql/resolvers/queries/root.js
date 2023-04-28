import debug from 'debug';

const dlog = debug('that:api:help:query');

const resolvers = {
  help: () => {
    dlog('help root called');
    return {};
  },
};

export default resolvers;
