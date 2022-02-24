import { Nullable } from "./Nullable";
import { BigInt } from "../math";
import { Context } from "../debug";
import { JSON } from "../json";

export abstract class Read {
  abstract readBool(): bool;
  abstract readInt8(): i8;
  abstract readInt16(): i16;
  abstract readInt32(): i32;
  abstract readUInt8(): u8;
  abstract readUInt16(): u16;
  abstract readUInt32(): u32;
  abstract readFloat32(): f32;
  abstract readFloat64(): f64;
  abstract readStringLength(): u32;
  abstract readString(): string;
  abstract readBytesLength(): u32;
  abstract readBytes(): ArrayBuffer;
  abstract readBigInt(): BigInt;
  abstract readJSON(): JSON.Value;
  abstract readArrayLength(): u32;
  abstract readArray<T>(fn: (reader: Read) => T): Array<T>;
  abstract readMapLength(): u32;
  abstract readMap<K, V>(
    key_fn: (reader: Read) => K,
    value_fn: (reader: Read) => V
  ): Map<K, V>;
  abstract readExtGenericMap<K, V>(
    key_fn: (reader: Read) => K,
    value_fn: (reader: Read) => V
  ): Map<K, V>;

  abstract readNullableBool(): Nullable<bool>;
  abstract readNullableInt8(): Nullable<i8>;
  abstract readNullableInt16(): Nullable<i16>;
  abstract readNullableInt32(): Nullable<i32>;
  abstract readNullableUInt8(): Nullable<u8>;
  abstract readNullableUInt16(): Nullable<u16>;
  abstract readNullableUInt32(): Nullable<u32>;
  abstract readNullableFloat32(): Nullable<f32>;
  abstract readNullableFloat64(): Nullable<f64>;
  abstract readNullableString(): string | null;
  abstract readNullableBytes(): ArrayBuffer | null;
  abstract readNullableBigInt(): BigInt | null;
  abstract readNullableJSON(): JSON.Value | null;
  abstract readNullableArray<T>(fn: (decoder: Read) => T): Array<T> | null;
  abstract readNullableMap<K, V>(
    key_fn: (reader: Read) => K,
    value_fn: (reader: Read) => V
  ): Map<K, V> | null;
  abstract readNullableExtGenericMap<K, V>(
    key_fn: (reader: Read) => K,
    value_fn: (reader: Read) => V
  ): Map<K, V> | null;

  abstract isNextNil(): bool;
  abstract isNextString(): bool;

  abstract context(): Context;
}
