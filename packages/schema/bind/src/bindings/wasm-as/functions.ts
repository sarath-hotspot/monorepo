import { isBaseType } from "./types";
import { MustacheFunction } from "../types";

export const toMsgPack: MustacheFunction = () => {
  return (value: string, render: (template: string) => string) => {
    let type = render(value);

    let modifier = "";
    if (type[type.length - 1] === "!") {
      type = type.substring(0, type.length - 1);
    } else {
      modifier = "Nullable";
    }

    if (type[0] === "[") {
      return modifier + "Array";
    }
    if (type.startsWith("Map<")) {
      return modifier + "ExtGenericMap";
    }
    switch (type) {
      case "Int":
        return modifier + "Int32";
      case "UInt":
        return modifier + "UInt32";
      case "Boolean":
        return modifier + "Bool";
      default:
        return modifier + type;
    }
  };
};

export const toWasmInit: MustacheFunction = () => {
  return (value: string, render: (template: string) => string) => {
    let type = render(value);

    if (type[type.length - 1] === "!") {
      type = type.substring(0, type.length - 1);
    } else {
      const nullType = toWasm()(value, render);
      const nullable = "Nullable";
      const nullOptional = "| null";

      if (nullType.endsWith(nullOptional)) {
        return "null";
      } else if (nullType.startsWith(nullable)) {
        return `new ${nullType}()`;
      }
    }

    if (type[0] === "[") {
      return "[]";
    }

    if (type.startsWith("Map<")) {
      const openBracketIdx = type.indexOf("<");
      const closeBracketIdx = type.lastIndexOf(">");
      const [key, value] = type
        .substring(openBracketIdx + 1, closeBracketIdx)
        .split(",")
        .map((x) => toWasm()(x.trim(), render));
      return `new Map<${key}, ${value}>()`;
    }

    switch (type) {
      case "Int":
      case "Int8":
      case "Int16":
      case "Int32":
      case "UInt":
      case "UInt8":
      case "UInt16":
      case "UInt32":
        return "0";
      case "String":
        return `""`;
      case "Boolean":
        return "false";
      case "Bytes":
        return `new ArrayBuffer(0)`;
      case "BigInt":
        return `BigInt.fromUInt16(0)`;
      case "JSON":
        return `JSON.Value.Null()`;
      default:
        if (type.includes("Enum_")) {
          return "0";
        } else {
          return `new Types.${type}()`;
        }
    }
  };
};

export const toWasm: MustacheFunction = () => {
  return (value: string, render: (template: string) => string) => {
    let type = render(value);
    let isEnum = false;

    let nullable = false;
    if (type[type.length - 1] === "!") {
      type = type.substring(0, type.length - 1);
    } else {
      nullable = true;
    }

    if (type[0] === "[") {
      return toWasmArray(type, nullable);
    }

    if (type.startsWith("Map<")) {
      return toWasmMap(type, nullable);
    }

    switch (type) {
      case "Int":
        type = "i32";
        break;
      case "Int8":
        type = "i8";
        break;
      case "Int16":
        type = "i16";
        break;
      case "Int32":
        type = "i32";
        break;
      case "UInt":
      case "UInt32":
        type = "u32";
        break;
      case "UInt8":
        type = "u8";
        break;
      case "UInt16":
        type = "u16";
        break;
      case "String":
        type = "string";
        break;
      case "Boolean":
        type = "bool";
        break;
      case "Bytes":
        type = "ArrayBuffer";
        break;
      case "BigInt":
        type = "BigInt";
        break;
      case "JSON":
        type = "JSON.Value";
        break;
      default:
        if (type.includes("Enum_")) {
          type = `Types.${type.replace("Enum_", "")}`;
          isEnum = true;
        } else {
          type = `Types.${type}`;
        }
    }

    return applyNullable(type, nullable, isEnum);
  };
};

const toWasmArray = (type: string, nullable: boolean): string => {
  const result = type.match(/(\[)([[\]A-Za-z1-9_.!]+)(\])/);

  if (!result || result.length !== 4) {
    throw Error(`Invalid Array: ${type}`);
  }

  const wasmType = toWasm()(result[2], (str) => str);
  return applyNullable("Array<" + wasmType + ">", nullable, false);
};

const toWasmMap = (type: string, nullable: boolean): string => {
  const firstOpenBracketIdx = type.indexOf("<");
  const lastCloseBracketIdx = type.lastIndexOf(">");

  if (!(firstOpenBracketIdx !== -1 && lastCloseBracketIdx !== -1)) {
    throw new Error(`Invalid Map: ${type}`);
  }

  const keyValTypes = type
    .substring(firstOpenBracketIdx + 1, lastCloseBracketIdx)
    .split(",")
    .map((x) => x.trim());

  if (keyValTypes.length !== 2 || !keyValTypes[0] || !keyValTypes[1]) {
    throw new Error(`Invalid Map: ${type}`);
  }

  const keyType = toWasm()(keyValTypes[0], (str) => str);
  const valType = toWasm()(keyValTypes[1], (str) => str);

  return applyNullable(`Map<${keyType}, ${valType}>`, nullable, false);
};

const applyNullable = (
  type: string,
  nullable: boolean,
  isEnum: boolean
): string => {
  if (nullable) {
    if (
      type.indexOf("Array") === 0 ||
      type.indexOf("string") === 0 ||
      (!isEnum && !isBaseType(type))
    ) {
      return `${type} | null`;
    } else {
      return `Nullable<${type}>`;
    }
  } else {
    return type;
  }
};
