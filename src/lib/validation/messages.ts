import type messages from "../../../messages/mk.json";

// Zod error messages are keys of the "Validation" translation namespace, so
// forms can show them translated. msg() makes a typo a type error.
export type ValidationMessage = keyof (typeof messages)["Validation"];

export function msg(key: ValidationMessage) {
  return key;
}
