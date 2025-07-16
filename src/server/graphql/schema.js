/*  OnlyFans Automation Manager
    File: schema.js
    Purpose: basic GraphQL schema with payout balance enhancement
    Created: 2025-07-06 – v1.0
    Modified: 2025-07-15 – v1.1
*/
import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLNonNull
} from 'graphql';
import { query } from '../db/db.js';
import { safeGET } from '../api/onlyfansApi.js';

// Fan type definition
const FanType = new GraphQLObjectType({
  name: 'Fan',
  fields: {
    fan_id: { type: GraphQLInt },
    display_name: { type: GraphQLString },
    username: { type: GraphQLString }
  }
});

// Root query including fans and balances
const RootQuery = new GraphQLObjectType({
  name: 'Query',
  fields: {
    fans: {
      type: new GraphQLList(FanType),
      resolve: async () => {
        const res = await query(
          'SELECT fan_id, display_name, username FROM fans LIMIT 50'
        );
        return res.rows;
      }
    },
    balances: {
      type: GraphQLInt,
      resolve: async () => {
        try {
          // Fetch account list from OnlyFans API
          const accounts = await safeGET('/api/accounts');
          const acctId = accounts.data[0]?.id;
          if (!acctId) return 0;
          // Fetch payout balances for the account
          const balRes = await safeGET(`/api/${acctId}/payouts/balances`);
          // API may return either amount or available field
          const balanceValue =
            balRes.data?.[0]?.amount ?? balRes.data?.[0]?.available ?? 0;
          return Math.round(balanceValue);
        } catch (error) {
          console.error('Error fetching balances:', error);
          return 0;
        }
      }
    }
  }
});

// Mutation definitions remain unchanged
const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    sendMessage: {
      type: GraphQLString,
      args: {
        fanId: { type: new GraphQLNonNull(GraphQLInt) },
        text: { type: new GraphQLNonNull(GraphQLString) }
      },
      resolve: async (_, { fanId, text }) => {
        const id = Date.now();
        await query(
          'INSERT INTO messages(msg_id, fan_id, direction, text, created_at) VALUES($1,$2,$3,$4,NOW())',
          [id, fanId, 'out', text]
        );
        return 'ok';
      }
    }
  }
});

// Export the enhanced schema
export const schema = new GraphQLSchema({
  query: RootQuery,
  mutation: Mutation
});
