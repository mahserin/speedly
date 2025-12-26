import { Request } from "express";
const createUpdateObject = (
  req: Request,
  additionalFields:
    | Record<string, any>
    | ((req: Request) => Record<string, any>)
) => {
  let updateObject: Record<string, any> = { $set: { ...req.body } };
  const additionalObject =
    typeof additionalFields === "function"
      ? additionalFields(req)
      : additionalFields;
  if (Object.keys(additionalObject).find((key) => key.startsWith("$")))
    updateObject = { ...updateObject, ...additionalObject };
  else updateObject.$set = { ...updateObject.$set, ...additionalObject };
  return updateObject;
};

export { createUpdateObject };
