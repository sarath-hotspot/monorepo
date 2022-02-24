import {
  isScalarType,
  scalarTypeNames,
  isModuleType,
  ModuleTypeNames,
} from "../typeInfo";
import { SchemaValidator } from "./";

import {
  DirectiveNode,
  DocumentNode,
  EnumTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  InterfaceTypeDefinitionNode,
  NamedTypeNode,
  ObjectTypeDefinitionNode,
  ScalarTypeDefinitionNode,
  StringValueNode,
  UnionTypeDefinitionNode,
} from "graphql";
import { getSchemaCycles } from "@dorgjelli/graphql-schema-cycles";

export const getTypeDefinitionsValidator = (): SchemaValidator => {
  const objectTypes: Record<string, boolean> = {};

  return {
    visitor: {
      enter: {
        // No Interfaces
        InterfaceTypeDefinition: (node: InterfaceTypeDefinitionNode) => {
          throw Error(
            "Interface type definitions are not supported.\n" +
              `Found: interface ${node.name.value} { ... }\n` +
              `Please Use: type ${node.name.value} { ... }`
          );
        },
        // No Inputs
        InputObjectTypeDefinition: (node: InputObjectTypeDefinitionNode) => {
          throw Error(
            "Input type definitions are not supported.\n" +
              `Found: input ${node.name.value} { ... }\n` +
              `Please Use: type ${node.name.value} { ... }`
          );
        },
        ObjectTypeDefinition: (node: ObjectTypeDefinitionNode) => {
          // No Subscriptions
          if (node.name.value === "Subscription") {
            throw Error(
              "Subscriptions are not yet supported. Please use Query or Mutation."
            );
          }

          // No duplicates
          if (objectTypes[node.name.value]) {
            throw Error(
              `Duplicate object type definition found: ${node.name.value}`
            );
          }

          objectTypes[node.name.value] = true;
        },
        // No New Scalars
        ScalarTypeDefinition: (node: ScalarTypeDefinitionNode) => {
          if (node.name.value !== "Map" && !isScalarType(node.name.value)) {
            throw Error(
              `Custom scalar types are not supported. Found: "${node.name.value}". Supported scalars: ${scalarTypeNames}`
            );
          }
        },
        // No Unions
        UnionTypeDefinition: (node: UnionTypeDefinitionNode) => {
          throw Error(
            "Union type definitions are not supported.\n" +
              `Found: union ${node.name.value}`
          );
        },
      },
    },
  };
};

export const getPropertyTypesValidator = (): SchemaValidator => {
  let currentObject: string | undefined;
  let currentImportType: string | undefined;
  let currentField: string | undefined;
  const objectTypes: Record<string, boolean> = {};
  const enumTypes: Record<string, boolean> = {};
  const duplicateFields: Record<string, Record<string, boolean>> = {};
  const fieldTypes: {
    object: string;
    field: string;
    type: string;
  }[] = [];

  return {
    visitor: {
      enter: {
        ObjectTypeDefinition: (node: ObjectTypeDefinitionNode) => {
          currentObject = node.name.value;
          objectTypes[node.name.value] = true;

          if (node.fields) {
            const fields: Record<string, boolean> = {};

            for (const field of node.fields) {
              if (fields[field.name.value]) {
                if (!duplicateFields[node.name.value]) {
                  duplicateFields[node.name.value] = {};
                }

                duplicateFields[node.name.value][field.name.value] = true;
              }

              fields[field.name.value] = true;
            }
          }
        },
        EnumTypeDefinition: (node: EnumTypeDefinitionNode) => {
          enumTypes[node.name.value] = true;
        },
        Directive: (node: DirectiveNode) => {
          if (node.name.value === "imported") {
            // save the imported native type name
            if (node.arguments) {
              const nativeType = node.arguments.find(
                (arg) => arg.name.value === "nativeType"
              );

              if (nativeType) {
                currentImportType = (nativeType.value as StringValueNode).value;
              }
            }
          }
        },
        FieldDefinition: (node) => {
          if (
            node.name.value === "sanitizeMutationEnv" ||
            node.name.value === "sanitizeQueryEnv"
          ) {
            return;
          }

          currentField = node.name.value;
        },
        NamedType: (node: NamedTypeNode) => {
          if (currentObject && currentField) {
            fieldTypes.push({
              object: currentObject,
              field: currentField,
              type: node.name.value,
            });
          }
        },
        InputValueDefinition: (node: InputValueDefinitionNode) => {
          const typeName = currentImportType
            ? currentImportType
            : currentObject;
          if (typeName && !isModuleType(typeName)) {
            // Arguments not supported on non-module types
            throw Error(
              `Methods can only be defined on module types (${ModuleTypeNames.join(
                ", "
              )}).\n` +
                `Found: type ${typeName} { ${currentField}(${node.name.value}) }`
            );
          }
        },
      },
      leave: {
        ObjectTypeDefinition: () => {
          currentObject = undefined;
          currentImportType = undefined;
        },
        FieldDefinition: () => {
          currentField = undefined;
        },
      },
    },
    cleanup: () => {
      // Ensure all property types are either a
      // supported scalar, enum or an object type definition
      for (const field of fieldTypes) {
        if (
          !isScalarType(field.type) &&
          !objectTypes[field.type] &&
          !enumTypes[field.type] &&
          field.type !== "Map"
        ) {
          throw Error(
            `Unknown property type found: type ${field.object} { ${field.field}: ${field.type} }`
          );
        }
      }

      const objectTypeNames = Object.keys(duplicateFields);

      if (objectTypeNames.length) {
        throw new Error(
          `Found duplicate fields in the following objects:${objectTypeNames.map(
            (object) =>
              `\ntype ${object} => ${JSON.stringify(
                Object.keys(duplicateFields[object])
              )}`
          )}`
        );
      }
    },
  };
};

export function getCircularDefinitionsValidator(): SchemaValidator {
  const operationTypes: string[] = [];
  const operationTypeNames = ["Mutation", "Subscription", "Query"];

  return {
    visitor: {
      enter: {
        ObjectTypeDefinition: (node: ObjectTypeDefinitionNode) => {
          const isOperationType = operationTypeNames.some(
            (name) =>
              node.name.value === name || node.name.value.endsWith(`_${name}`)
          );
          if (isOperationType) {
            operationTypes.push(node.name.value);
          }
        },
      },
    },
    cleanup: (documentNode: DocumentNode) => {
      const { cycleStrings, foundCycle } = getSchemaCycles(documentNode, {
        ignoreTypeNames: operationTypes,
        allowOnNullableFields: true,
      });

      if (foundCycle) {
        throw Error(
          `Graphql cycles are not supported. \nFound: ${cycleStrings.map(
            (cycle) => `\n- ${cycle}`
          )}`
        );
      }
    },
  };
}
