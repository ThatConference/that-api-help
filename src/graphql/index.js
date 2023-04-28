import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { buildSubgraphSchema } from '@apollo/subgraph';
import debug from 'debug';
import * as Sentry from '@sentry/node';
import { security } from '@thatconference/api';
import { isNil } from 'lodash';
import DataLoader from 'dataloader';
import helpPostStore from '../dataSources/cloudFirestore/helpPost';

// Graph Types and Resolvers
import typeDefs from './typeDefs';
import resolvers from './resolvers';
import directives from './directives';

const dlog = debug('that:api:help:graphServer');
const jwtClient = security.jwt();

/**
 * creates an Apollo server instance and the context
 * Both are returned separately as the context is added to
 * Expressjs directly
 * @param {object} datasources - datasources to add to context
 * @param {object} httpServer - required for Apollo connection drain
 *
 * @return {object, object}
 */

const createServerParts = ({ dataSources, httpServer }) => {
  dlog('🚜 creating apollo server and context');
  let schema = {};

  dlog('🚜 building subgraph schema');
  schema = buildSubgraphSchema([{ typeDefs, resolvers }]);

  const directiveTransformers = [
    directives.auth('auth').authDirectiveTransformer,
  ];

  dlog('🚜 adding directiveTransformers: %O', directiveTransformers);
  schema = directiveTransformers.reduce(
    (curSchema, transformer) => transformer(curSchema),
    schema,
  );

  dlog('🚜 creating new apollo server instance');
  const graphQlServer = new ApolloServer({
    schema,
    introspection: JSON.parse(process.env.ENABLE_GRAPH_INTROSPECTION || false),
    csrfPrevention: true,
    cache: 'bounded',
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: err => {
      dlog('formatError %O', err);

      Sentry.withScope(scope => {
        scope.setTag('formatError', true);
        scope.setLevel('warning');
        scope.setContext('originalError', { originalError: err.originalError });
        scope.setContext('path', { path: err.path });
        scope.setContext('error object', { error: err });
        Sentry.captureException(err);
      });

      return err;
    },
  });

  dlog('🚜 creating createContext function');
  const createContext = async ({ req, res }) => {
    dlog('🚜 building graphql user context');
    dlog('🚜 assembling datasources');
    const { firestore } = dataSources;
    let context = {
      dataSources: {
        ...dataSources,
        helpPostLoader: new DataLoader(ids =>
          helpPostStore(firestore)
            .batchFindHelpPosts(ids)
            .then(helpPosts => {
              if (helpPosts.includes(null)) {
                Sentry.withScope(scope => {
                  scope.setLevel('error');
                  scope.setContext('helpPost loader posts returned null', {
                    ids,
                    helpPosts,
                  });
                  Sentry.captureMessage('helpPost loader posts returned null');
                });
              }
              return ids.map(i => helpPosts.find(p => p && p.id === i));
            }),
        ),
      },
    };

    dlog('🚜 auth header %o', req.headers);
    if (!isNil(req.headers.authorization)) {
      dlog('🚜 validating token for %o:', req.headers.authorization);

      Sentry.addBreadcrumb({
        category: 'graphql context',
        message: 'user has authToken',
        level: 'info',
      });

      const validatedToken = await jwtClient.verify(req.headers.authorization);

      Sentry.configureScope(scope => {
        scope.setUser({
          id: validatedToken.sub,
          permissions: validatedToken.permissions.toString(),
        });
      });

      dlog('🚜 validated token: %o', validatedToken);
      context = {
        ...context,
        user: {
          ...validatedToken,
          site: req.userContext.site,
          correlationId: req.userContext.correlationId,
        },
      };
    }

    return context;
  };

  return {
    graphQlServer,
    createContext,
  };
};

export default createServerParts;
