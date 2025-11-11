let __path = "./models/";
import path from 'path'
import strToObj from '../util/strToObj';
import getConfig from '../util/getConfig';
import translator from '../util/translator'
import { Request , Response , NextFunction } from 'express';

// Extend Express Request and Response interfaces to include 'document', 'user', and 'logger'
declare module 'express-serve-static-core' {
  interface Request {
    document?: any;
    user?: any; // Add this line to fix the error
  }
  interface Response {
    logger?: (message: string, details?: any) => void;
    success?: (statusCode: number, body: any) => void;
  }
}

type ConfigsType = {
  dbType?: string;
  path?: string;
  dbEnv?: string;
  type : 'internal'|'external'
  pagination?: {
    quantity?: number;
    detailed?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

let configs: ConfigsType = {
  dbType: "mongodb",
  path: "../models",
  type :'external',
  dbEnv: "DB_URL",
  ...getConfig("db"),
};
type QueryState = {
  action?: string,
  match?: { [key: string]: unknown } | ((req : Request) => { [key: string]: unknown })
  body?: { [key: string]: unknown }| ((req : Request) => { [key: string]: unknown })
  pipeline? : {[key : string] : {[key : string] : unknown}}[] | ((req : Request) => { [key: string]: unknown }[])
  queries: (
    { type: string, value: unknown } |
    { $skip: number } |
    { $facet: unknown } |
    { $unwind: string } |
    { $limit: number }
  )[]
  id ?: string
}
const usingMongoDb = (collectionName: string, config: {
  message?: string; path?: string, 
  type? :'internal' | 'external'
} = {type :'external'}) => {
  let model;
  let queryState: QueryState = {
    queries: [],
  };
  if (config?.path) __path = config.path;
  model = require(path.join(...(config.type == 'external' ? [require.main?.filename|| './' , __path] : ['../model']), collectionName));
  const actionHandler = {
    find: (match = {}) => {
      queryState.action = "find";
      queryState.match = match;
      return handler;
    },
    create: (body = {}) => {
      queryState.action = "create";
      queryState.body = body;
      return handler;
    },
    updateOne: (match = {}, body = {}) => {
      queryState.action = "updateOne";
      queryState.match = match;
      queryState.body = body;
      return handler;
    },
    updateMany: (match = {}, body = {}) => {
      queryState.action = "updateMany";
      queryState.match = match;
      queryState.body = body;
      return handler;
    },
    deleteOne: (match = {}) => {
      queryState.action = "deleteOne";
      queryState.match = match;
      return handler;
    },
    deleteMany: (match = {}) => {
      queryState.action = "deleteMany";
      queryState.match = match;
      return handler;
    },
    findOne: (match = {}) => {
      queryState.action = "findOne";
      queryState.match = match;
      return handler;
    },
    findOneAndUpdate: (match = {}, body = {}) => {
      queryState.action = "findOneAndUpdate";
      queryState.match = match;
      queryState.body = body;
      return handler;
    },
    aggregate: (pipeline = []) => {
      queryState.action = "aggregate";
      queryState.pipeline = pipeline;
      return handler;
    },
    findOneAndDelete: (match = {}) => {
      queryState.action = "findOneAndDelete";
      queryState.match = match;
      return handler;
    },
    findById: (id = "") => {
      queryState.action = "findById";
      queryState.id = id;
      return handler;
    },
    findByIdAndUpdate: (id = "", body = {}) => {
      queryState.action = "findByIdAndUpdate";
      queryState.id = id;
      queryState.body = body;
      return handler;
    },
    findByIdAndDelete: (id = "") => {
      queryState.action = "findByIdAndDelete";
      queryState.id = id;
      return handler;
    },
  };
  /**
   * Handles database operations for the specified model based on the action and query parameters.
   * @param {object} req - Express request object containing query and body data.
   * @param {object} res - Express response object used to send responses.
   * @param {function} next - Express next middleware function for error handling.
   */
  const handler = async (req : Request  , res : Response, next : NextFunction) => {
    let data : any = undefined,
      detail = {};
    let match : {[key : string] : unknown} = {};
    let realTimeQueries = [...queryState.queries];
    const { sort, limit, page, select } = req.query;

    if (req.query.search) {
      const searchStr = Array.isArray(req.query.search)
        ? req.query.search[0]
        : req.query.search;
      if (typeof searchStr === "string") {
        const splittedSearch = searchStr.trim().split(/\s|‌/g);
        const searchValue = splittedSearch
          .map((word) => `(?=.*${word.split("").join("\\s?")})`)
          .join("");
        match.$or = [
          { name: { $regex: searchValue } },
          { title: { $regex: searchValue } },
          { subTitle: { $regex: searchValue } },
        ];
      }
    }
    if (req.query.filters) {
      const filtersStr = Array.isArray(req.query.filters)
        ? req.query.filters[0]
        : req.query.filters;
      if (typeof filtersStr === "string") {
        match = { ...match, ...JSON.parse(filtersStr) };
      }
    }
    if (typeof queryState.match == "function")
      match = { ...match, ...queryState.match(req) };
    if (typeof queryState.match == "object")
      match = { ...match, ...queryState.match };
    {
      if (req.query.sort && queryState.action !== "aggregate") {
        const sortQueryIndex = realTimeQueries.findIndex(
          (q) => 'type' in q && q.type == "sort"
        );
        const sortStr = Array.isArray(req.query.sort)
          ? req.query.sort[0]
          : req.query.sort;
        const sortObject = typeof sortStr === "string" ? strToObj(sortStr) : {};
        if (sortQueryIndex == -1)
          realTimeQueries.push({
            type: "sort",
            value: (typeof sortStr === "string" ? sortStr : "") + " _id",
          });
        else
          realTimeQueries.splice(sortQueryIndex, 1, {
            type: "sort",
            value: {
              ...((realTimeQueries[sortQueryIndex] && 'value' in realTimeQueries[sortQueryIndex] && typeof realTimeQueries[sortQueryIndex].value === 'object' && realTimeQueries[sortQueryIndex].value !== null) ? realTimeQueries[sortQueryIndex].value : {}),
              ...sortObject,
              _id: 1,
            },
          });
      }
      if (req.query.page && queryState.action !== "aggregate") {
        const pageStr = Array.isArray(req.query.page) ? req.query.page[0] : typeof req.query.page === 'string' ? req.query.page : '';
        const limitStr = Array.isArray(req.query.limit) ? req.query.limit[0] : typeof req.query.limit === 'string' ? req.query.limit : '';
        const pageNum = parseInt(typeof pageStr === 'string' ? pageStr : '') || 1;
        const limitNum = parseInt(typeof limitStr === 'string' ? limitStr : '') || configs?.pagination?.quantity || 20;

        if (realTimeQueries.findIndex((q) => 'type' in q && q.type == "skip") == -1)
          realTimeQueries.push({
            type: "skip",
            value: (pageNum - 1) * limitNum,
          });
        if (realTimeQueries.findIndex((q) => 'type' in q && q.type == "limit") == -1)
          realTimeQueries.push({
            type: "limit",
            value: limitNum,
          });
      } else if (req.query.limit && queryState.action !== "aggregate") {
        const pageStrAgg = Array.isArray(req.query.page) ? req.query.page[0] : typeof req.query.page === 'string' ? req.query.page : '';
        const limitStrAgg = Array.isArray(req.query.limit) ? req.query.limit[0] : typeof req.query.limit === 'string' ? req.query.limit : '';
        const pageNumAgg = parseInt(typeof pageStrAgg === 'string' ? pageStrAgg : '') || 1;
        const limitNumAgg = parseInt(typeof limitStrAgg === 'string' ? limitStrAgg : '') || 20;
        realTimeQueries.push(
          { $skip: (pageNumAgg - 1) * limitNumAgg },
          { $limit: parseInt(
              Array.isArray(req.query.limit)
                ? String(req.query.limit[0])
                : typeof req.query.limit === 'string'
                  ? req.query.limit
                  : req.query.limit !== undefined
                    ? String(req.query.limit)
                    : ''
            ) }
        );
      } else if (req.query.limit && queryState.action == "aggregate") {
        realTimeQueries.push({ $limit: parseInt(String(req.query.limit)) });
      }

      if (req.query.select && queryState.action !== "aggregate") {
        const selectQueryIndex = realTimeQueries.findIndex(
          (q) => 'type' in q && q.type == "select"
        );
        if (selectQueryIndex == -1)
          realTimeQueries.push({ type: "select", value: req.query.select });
      }
    }

    try {
      const page = parseInt(Array.isArray(req.query.page) ? String(req.query.page[0]) : typeof req.query.page === 'string' ? req.query.page : '') || 1;
      const limit =
        parseInt(Array.isArray(req.query.limit) ? String(req.query.limit[0]) : typeof req.query.limit === 'string' ? req.query.limit : req.query.limit !== undefined ? String(req.query.limit) : '') ||
        configs.pagination?.quantity ||
        20;

      switch (queryState.action) {
        case "find":
          if (configs.pagination?.detailed && req.query.page) {
            const page = parseInt(Array.isArray(req.query.page) ? String(req.query.page[0]) : typeof req.query.page === 'string' ? req.query.page : '') || 1;
            const limit =
              parseInt(Array.isArray(req.query.limit) ? String(req.query.limit[0]) : typeof req.query.limit === 'string' ? req.query.limit : req.query.limit !== undefined ? String(req.query.limit) : '') ||
              configs.pagination?.quantity ||
              20;
              console.log('db', 261, model , config.path);
            const totalPages = Math.ceil(
              (await model.countDocuments(match)) / limit
            );
            detail = {
              ...detail,
              page,
              limit,
              totalPages,
            };
          }
          data = model?.find?.call(model, match);
          break;
        case "create":
          req.body = Array.isArray(req.body)
            ? req.body.map((item) => ({
              ...item,
              ...(typeof queryState.body == "function"
                ? queryState.body(req)
                : queryState.body),
            }))
            : {
              ...req.body,
              ...(typeof queryState.body == "function"
                ? queryState.body(req)
                : queryState.body),
            };
          data = model?.[queryState.action]?.call(model, req.body);
          break;
        case "updateOne":
          data = model?.[queryState.action]?.call(model, match, {
            ...req.body,
            ...(typeof queryState.body == "function"
              ? queryState.body(req)
              : queryState.body),
          });
          break;
        case "updateMany":
          data = model?.[queryState.action]?.call(model, match, {
            ...req.body,
            ...(typeof queryState.body == "function"
              ? queryState.body(req)
              : queryState.body),
          });
          break;
        case "deleteOne":
          data = model?.[queryState.action]?.call(model, match);
          break;
        case "deleteMany":
          data = model?.[queryState.action]?.call(model, match);
          break;
        case "findOne":
          data = model?.[queryState.action]?.call(model, match);
          break;
        case "findOneAndUpdate":
          req.document = await model.findOne(match);
          data = model?.[queryState.action]?.call(
            model,
            match,
            {
              $set: {
                ...req.body,
                ...(typeof queryState.body == "function"
                  ? queryState.body(req)
                  : queryState.body),
              },
            },
            { new: true }
          );
          break;
        case "findOneAndDelete":
          data = model?.[queryState.action]?.call(model, match);
          break;
        case "findById":
          data = model?.[queryState.action]?.call(
            model,
            queryState.id || req.params.id
          );
          break;
        case "aggregate":
          if (configs.pagination?.detailed && req.query.page) {
            const page = parseInt(req.query.page as string) || 1;
            const limit =
              parseInt(req.query.limit as string) ||
              configs.pagination?.quantity ||
              20;
            realTimeQueries = [
              {
                $facet: {
                  content: [...realTimeQueries],
                  detail: [
                    { $group: { _id: null, count: { $sum: 1 } } },
                    {
                      $addFields: {
                        totalPages: { $ceil: { $divide: ["$count", limit] } },
                        page, limit
                      },
                    },
                    {
                      $unset: ['_id', 'count']
                    }
                  ],
                },
              }, {
                $unwind: '$detail'
              }
            ];
          } else {
            realTimeQueries = [
              {
                $facet: {
                  content: [...realTimeQueries],
                }
              }]
          }
          // res.status(200).json([...queryState.pipeline , ...realTimeQueries])
          if (typeof queryState.pipeline == "function") {
            data = model?.[queryState.action]?.call(
              model,
              [...queryState.pipeline(req), ...realTimeQueries] 
            );
          } else {

            data = model?.[queryState.action]?.call(
              model,
              [...(queryState.pipeline || []), ...realTimeQueries] 
            );
          }
          break;
        case "findByIdAndUpdate":
          req.document = await model.findByIdAndUpdate(
            queryState.id || req.params.id
          );
          data = model?.[queryState.action]?.call(
            model,
            queryState.id || req.params.id,
            Object.entries({
              ...req.body,
              ...(typeof queryState.body == "function"
                ? queryState.body(req)
                : queryState.body),
            }).reduce((acc : {$set ? : {[key : string] : unknown},$unset ? : {[key : string] : unknown}}, [key, value]) => {
              if (value == "$$REMOVE") {
                return { ...acc, $unset: { ...acc?.$unset, [key]: value } };
              }
              return { ...acc, $set: { ...acc?.$set, [key]: value } };
            }, {} ),
            { new: true }
          );
          break;
        case "findByIdAndDelete":
          data = model?.[queryState.action]?.call(
            model,
            queryState.id || req.params.id
          );
          break;
      }
      if (queryState.action != "aggregate")
        realTimeQueries.forEach((q) => {
          if ('type' in q && typeof data?.[q.type] === "function") {
            data = data[q.type].call(data, q.value);
          }
        });
      // if(req.query.select) data = data.select(req.query.select)
      data = await data;
      if (!data) {
        next({
          status: 404,
          json: {
            message: `${collectionName} not found.`,
          },
        });
      } else {
        if (res.logger && req.user) {
          if (queryState.action && queryState.action.match(/create|update|delete/i)?.[0]) {
            res.logger(
              `${{ log: "لاگ‌ها" }[collectionName] ||
              (await translator(`${collectionName}`))
              } ${data.name || data.title || data.id || data._id || ""
              } توسط ${(req.user?.firstName ? req.user?.firstName + " " : "") +
              (req.user?.lastName || "") ||
              `ادمین با شماره ${req.user.phoneNumber}`
              } ${{ create: "ایجاد", update: "بروزرسانی", delete: "حذف" ,nothing : ''}[
              queryState.action
                .match(/create|update|delete/i)?.[0]
                ?.toLowerCase() || 'nothing'
              ] || queryState.action 
              } شد`,
              queryState.action.match(/update/i)?.[0]
                ? (
                  await Promise.all(
                    Object.entries(data._doc)
                      .filter(([key, value]) =>
                        ["_id", "__v", "updatedAt"].includes(key)
                          ? false
                          : req.document._doc[key] == undefined ||
                          req.document._doc[key]?.toString?.() !==
                          value?.toString?.()
                      )
                      .map(async (item) => {
                        const translatedField = await translator(
                          item[0],
                          "fa"
                        );
                        if (req.document[item[0]] == undefined) {
                          return `فیلد ${translatedField} اضافه شد`;
                        } else {
                          return `فیلد ${translatedField} از ${req.document[item[0]]
                            } به ${item[1]} تغییر یافت`;
                        }
                      })
                  )
                ).concat(
                  await Promise.all(
                    Object.entries(req.document._doc)
                      .filter(([key, value]) =>
                        ["_id", "__v", "updatedAt"].includes(key)
                          ? false
                          : data._doc[key] == undefined
                      )
                      .map(async (item) => {
                        const translatedField = await translator(
                          item[0],
                          "fa"
                        );
                        return `فیلد ${translatedField} حذف شد`;
                      })
                  )
                )
                : []
            );
          }
        }
        const action =
          queryState.action?.match(/create|update|delet/i)?.[0] || "find";
          const resBody  = queryState.action == 'aggregate' ? {
          message:
            config?.message ||
            `the ${collectionName} was found successfully`, content: [], ...data[0]
        } : {
          content: data,
          ...{ detail: Object.keys(detail).length ? detail : undefined },
          message:
            config?.message ||
            `the ${collectionName} was ${action == "find" ? "found" : action + "ed"
            }`,
        }
        res.success ? res.success(200, resBody) : res.status(200).json(resBody)
      }
    } catch (err) {
      if (err && typeof err === 'object' && 'errorResponse' in err && (err as any).errorResponse?.code == 11000)
        return next({
          status: 405,
          json: {
            message: `(${Object.entries((err as any).errorResponse.keyValue)[0][0]
              }) already exists; write a unique value`,
          },
        });
      console.error("Error : model", err);
      return next({
        status: 500,
        json: {
          message: "Internal Server Error",
        },
      });
    }
  };
  handler.select = (value : string | {[key : string] : -1 |1} ) => {
    queryState.queries.push({
      type: "select",
      value: typeof value == "string" ? strToObj(value, 0) : value,
    });
    return handler;
  };

  handler.sort = (value : string | {[key : string] : -1 | 1}) => {
    queryState.queries.push({
      type: "sort",
      value: typeof value == "string" ? strToObj(value) : value,
    });
    return handler;
  };
  handler.skip = (value : number) => {
    queryState.queries.push({ type: "skip", value });
    return handler;
  };
  handler.limit = (value : number) => {
    queryState.queries.push({ type: "limit", value });
    return handler;
  };
  handler.populate = (value: string | object | (string|object)[] ) => {
    queryState.queries.push({ type: "populate", value });
    return handler;
  };
  return actionHandler;
};

// const usingMySql = (tableName, config) => {
//   const mysqlConnection = mysql.createConnection(process.env[configs.dbEnv]);
//   mysqlConnection.connect((err) => {
//     if (err) console.log("DB ERR: ", err.message);
//     else console.log("database connected successfully ");
//   });
//   const db = mysqlConnection.promise()

//   let queryState = {
//     queryString: "select * from ?",
//     variables: [{ tableName }],
//   };
//   const requestHandler = async (req, res, next) => {

//     const [result] = await db.query(queryState.queryString, queryState.variables);

//   };
//   const chainActions = {
//     query: (query = "select * from ?", ...variables) => {
//       queryState = { queryString: query, variables };
//       return requestHandler;
//     },
//   };

//   return chainActions;
// };
const db = (collectionName : string, config = configs) => {
  let generatedConfig : ConfigsType= {
    dbType: "mongodb",
    path: "../models",
    dbEnv: "DB_URL",
    type :'external',
    ...getConfig("db"),
  };
  Object.entries(config).forEach(([key, value]) => {
    generatedConfig[key] = value;
  });
  switch (generatedConfig.dbType) {
    case "mongodb":
      return usingMongoDb(collectionName, generatedConfig);
    case "mysql":
      // return usingMySql(collectionName, generatedConfig);
  }
};

export default db;
