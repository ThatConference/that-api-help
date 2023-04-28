import debug from 'debug';

const dlog = debug('that:api:help:mutations');

const resolvers = {
  help: () => {
    dlog('help root called');
    return {};
  },
};

export default resolvers;
