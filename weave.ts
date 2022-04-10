import * as fs from 'fs';

class Reader {
  view: DataView;
  ofs: number = 0;

  constructor(buf: ArrayBuffer) {
    this.view = new DataView(buf);
  }

  done(): boolean {
    return this.ofs == this.view.byteLength;
  }

  read8(): number {
    const val = this.view.getUint8(this.ofs);
    this.ofs += 1;
    return val;
  }
  back(): void {
    this.ofs -= 1;
  }

  read32(): number {
    const val = this.view.getUint32(this.ofs, true);
    this.ofs += 4;
    return val;
  }

  readUint(): number {
    let n = 0;
    let shift = 0;
    while (true) {
      const b = this.read8();
      n |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    return n;
  }

  readF32(): number {
    const val = this.view.getFloat32(this.ofs, true);
    this.ofs += 4;
    return val;
  }

  readF64(): number {
    const val = this.view.getFloat64(this.ofs, true);
    this.ofs += 8;
    return val;
  }

  skip(len: number) {
    this.ofs += len;
  }
}

enum Type {
  i32 = 'i32',
  i64 = 'i64',
  f32 = 'f32',
  f64 = 'f64',
  v128 = 'v128',
  funcref = 'funcref',
  externref = 'externref',
}

enum Instr {
  // control
  unreachable = 'unreachable',
  nop = 'nop',
  block = 'block',
  loop = 'loop',
  if = 'if',
  else = 'else',
  end = 'end',
  br = 'br',
  br_if = 'br_if',
  br_table = 'br_table',
  return = 'return',
  call = 'call',
  call_indirect = 'call_indirect',

  // parametric
  drop = 'drop',
  select = 'select',

  // variable
  local_get = 'local.get',
  local_set = 'local.set',
  local_tee = 'local.tee',
  global_get = 'global.get',
  global_set = 'global.set',

  // memory
  i32_load = 'i32.load',
  i64_load = 'i64.load',
  f32_load = 'f32.load',
  f64_load = 'f64.load',
  i32_load8_s = 'i32.load8_s',
  i32_load8_u = 'i32.load8_u',
  i32_load16_s = 'i32.load16_s',
  i32_load16_u = 'i32.load16_u',
  i64_load8_s = 'i64.load8_s',
  i64_load8_u = 'i64.load8_u',
  i64_load16_s = 'i64.load16_s',
  i64_load16_u = 'i64.load16_u',
  i64_load32_s = 'i64.load32_s',
  i64_load32_u = 'i64.load32_u',
  i32_store = 'i32.store',
  i64_store = 'i64.store',
  f32_store = 'f32.store',
  f64_store = 'f64.store',
  i32_store8 = 'i32.store8',
  i32_store16 = 'i32.store16',
  i64_store8 = 'i64.store8',
  i64_store16 = 'i64.store16',
  i64_store32 = 'i64.store32',

  // numeric
  // const
  i32_const = 'i32.const',
  i64_const = 'i64.const',
  f32_const = 'f32.const',
  f64_const = 'f64.const',

  i32_eqz = 'i32.eqz',
  i32_eq = 'i32.eq',
  i32_ne = 'i32.ne',
  i32_lt_s = 'i32.lt_s',
  i32_lt_u = 'i32.lt_u',
  i32_gt_s = 'i32.gt_s',
  i32_gt_u = 'i32.gt_u',
  i32_le_s = 'i32.le_s',
  i32_le_u = 'i32.le_u',
  i32_ge_s = 'i32.ge_s',
  i32_ge_u = 'i32.ge_u',
  i64_eqz = 'i64.eqz',
  i64_eq = 'i64.eq',
  i64_ne = 'i64.ne',
  i64_lt_s = 'i64.lt_s',
  i64_lt_u = 'i64.lt_u',
  i64_gt_s = 'i64.gt_s',
  i64_gt_u = 'i64.gt_u',
  i64_le_s = 'i64.le_s',
  i64_le_u = 'i64.le_u',
  i64_ge_s = 'i64.ge_s',
  i64_ge_u = 'i64.ge_u',
  f32_eq = 'f32.eq',
  f32_ne = 'f32.ne',
  f32_lt = 'f32.lt',
  f32_gt = 'f32.gt',
  f32_le = 'f32.le',
  f32_ge = 'f32.ge',
  f64_eq = 'f64.eq',
  f64_ne = 'f64.ne',
  f64_lt = 'f64.lt',
  f64_gt = 'f64.gt',
  f64_le = 'f64.le',
  f64_ge = 'f64.ge',
  i32_clz = 'i32.clz',
  i32_ctz = 'i32.ctz',
  i32_popcnt = 'i32.popcnt',
  i32_add = 'i32.add',
  i32_sub = 'i32.sub',
  i32_mul = 'i32.mul',
  i32_div_s = 'i32.div_s',
  i32_div_u = 'i32.div_u',
  i32_rem_s = 'i32.rem_s',
  i32_rem_u = 'i32.rem_u',
  i32_and = 'i32.and',
  i32_or = 'i32.or',
  i32_xor = 'i32.xor',
  i32_shl = 'i32.shl',
  i32_shr_s = 'i32.shr_s',
  i32_shr_u = 'i32.shr_u',
  i32_rotl = 'i32.rotl',
  i32_rotr = 'i32.rotr',
  i64_clz = 'i64.clz',
  i64_ctz = 'i64.ctz',
  i64_popcnt = 'i64.popcnt',
  i64_add = 'i64.add',
  i64_sub = 'i64.sub',
  i64_mul = 'i64.mul',
  i64_div_s = 'i64.div_s',
  i64_div_u = 'i64.div_u',
  i64_rem_s = 'i64.rem_s',
  i64_rem_u = 'i64.rem_u',
  i64_and = 'i64.and',
  i64_or = 'i64.or',
  i64_xor = 'i64.xor',
  i64_shl = 'i64.shl',
  i64_shr_s = 'i64.shr_s',
  i64_shr_u = 'i64.shr_u',
  i64_rotl = 'i64.rotl',
  i64_rotr = 'i64.rotr',
  f32_abs = 'f32.abs',
  f32_neg = 'f32.neg',
  f32_ceil = 'f32.ceil',
  f32_floor = 'f32.floor',
  f32_trunc = 'f32.trunc',
  f32_nearest = 'f32.nearest',
  f32_sqrt = 'f32.sqrt',
  f32_add = 'f32.add',
  f32_sub = 'f32.sub',
  f32_mul = 'f32.mul',
  f32_div = 'f32.div',
  f32_min = 'f32.min',
  f32_max = 'f32.max',
  f32_copysign = 'f32.copysign',
  f64_abs = 'f64.abs',
  f64_neg = 'f64.neg',
  f64_ceil = 'f64.ceil',
  f64_floor = 'f64.floor',
  f64_trunc = 'f64.trunc',
  f64_nearest = 'f64.nearest',
  f64_sqrt = 'f64.sqrt',
  f64_add = 'f64.add',
  f64_sub = 'f64.sub',
  f64_mul = 'f64.mul',
  f64_div = 'f64.div',
  f64_min = 'f64.min',
  f64_max = 'f64.max',
  f64_copysign = 'f64.copysign',
  i32_wrap_i64 = 'i32.wrap_i64',
  i32_trunc_f32_s = 'i32.trunc_f32_s',
  i32_trunc_f32_u = 'i32.trunc_f32_u',
  i32_trunc_f64_s = 'i32.trunc_f64_s',
  i32_trunc_f64_u = 'i32.trunc_f64_u',
  i64_extend_i32_s = 'i64.extend_i32_s',
  i64_extend_i32_u = 'i64.extend_i32_u',
  i64_trunc_f32_s = 'i64.trunc_f32_s',
  i64_trunc_f32_u = 'i64.trunc_f32_u',
  i64_trunc_f64_s = 'i64.trunc_f64_s',
  i64_trunc_f64_u = 'i64.trunc_f64_u',
  f32_convert_i32_s = 'f32.convert_i32_s',
  f32_convert_i32_u = 'f32.convert_i32_u',
  f32_convert_i64_s = 'f32.convert_i64_s',
  f32_convert_i64_u = 'f32.convert_i64_u',
  f32_demote_f64 = 'f32.demote_f64',
  f64_convert_i32_s = 'f64.convert_i32_s',
  f64_convert_i32_u = 'f64.convert_i32_u',
  f64_convert_i64_s = 'f64.convert_i64_s',
  f64_convert_i64_u = 'f64.convert_i64_u',
  f64_promote_f32 = 'f64.promote_f32',
  i32_reinterpret_f32 = 'i32.reinterpret_f32',
  i64_reinterpret_f64 = 'i64.reinterpret_f64',
  f32_reinterpret_i32 = 'f32.reinterpret_i32',
  f64_reinterpret_i64 = 'f64.reinterpret_i64',
  i32_extend8_s = 'i32.extend8_s',
  i32_extend16_s = 'i32.extend16_s',
  i64_extend8_s = 'i64.extend8_s',
  i64_extend16_s = 'i64.extend16_s',
  i64_extend32_s = 'i64.extend32_s',
}

interface Instruction {
  op: Instr;
}
interface InstrIf {
  op: Instr.if;
  body: Instruction[];
  else?: Instruction[];
}

class Parser {
  constructor(private r: Reader) {}

  readHeader(): void {
    const magic = this.r.read32();
    if (magic !== 0x6d736100)
      throw new Error(`invalid signature: ${magic.toString(16)}`);
    const version = this.r.read32();
    if (version !== 1)
      throw new Error(`bad version, expected 1, got ${version}`);
  }

  readValType() {
    const n = this.r.read8();
    switch (n) {
      case 0x7f:
        return Type.i32;
      case 0x7e:
        return Type.i64;
      case 0x7d:
        return Type.f32;
      case 0x7c:
        return Type.f64;
      case 0x7b:
        return Type.v128;
      case 0x70:
        return Type.funcref;
      case 0x6f:
        return Type.externref;
      default:
        throw new Error(`unknown type byte ${n.toString(16)}`);
    }
  }

  readBlockType() {
    const b = this.r.read8();
    if (b === 0x40) {
      return undefined;
    }
    this.r.back();
    return this.readValType();
    // todo https://webassembly.github.io/spec/core/binary/instructions.html#binary-blocktype
  }

  readMemArg(): { align: number; offset: number } {
    return { align: this.r.readUint(), offset: this.r.readUint() };
  }

  readInstruction(): Instruction {
    const op = this.r.read8();
    switch (op) {
      case 0x00:
        return { op: Instr.unreachable };
      case 0x01:
        return { op: Instr.nop };
      case 0x02:
        this.readBlockType();
        return { op: Instr.block, body: this.readExpr() } as Instruction;
      case 0x03:
        this.readBlockType();
        return { op: Instr.loop, body: this.readExpr() } as Instruction;
      case 0x04:
        this.readBlockType();
        {
          let [body, end] = this.readInstrs();
          let instr: InstrIf = { op: Instr.if, body };
          if (end === Instr.else) {
            instr.else = this.readExpr();
          }
          return instr;
        }
      case 0x05:
        return { op: Instr.else };
      case 0x0b:
        return { op: Instr.end };
      case 0x0c:
        return { op: Instr.br, label: this.r.readUint() } as Instruction;
      case 0x0d:
        return { op: Instr.br_if, label: this.r.readUint() } as Instruction;
      case 0x0e:
        //return {op: Instr.br_table};
        throw new Error('unimplemented');
      case 0x0f:
        return { op: Instr.return };
      case 0x10:
        return { op: Instr.call, func: this.r.readUint() } as Instruction;
      case 0x11:
        return {
          op: Instr.call_indirect,
          type: this.r.readUint(),
          table: this.r.readUint(),
        } as Instruction;

      case 0x1a:
        return { op: Instr.drop };
      case 0x1b:
        return { op: Instr.select };
      case 0x1c: {
        const types = [];
        const len = this.r.readUint();
        for (let i = 0; i < len; i++) {
          types.push(this.readValType());
        }
        return { op: Instr.select, types } as Instruction;
      }

      case 0x20:
        return { op: Instr.local_get, local: this.r.readUint() } as Instruction;
      case 0x21:
        return { op: Instr.local_set, local: this.r.readUint() } as Instruction;
      case 0x22:
        return { op: Instr.local_tee, local: this.r.readUint() } as Instruction;
      case 0x23:
        return {
          op: Instr.global_get,
          global: this.r.readUint(),
        } as Instruction;
      case 0x24:
        return {
          op: Instr.global_set,
          global: this.r.readUint(),
        } as Instruction;

      case 0x28:
        return { op: Instr.i32_load, mem: this.readMemArg() } as Instruction;
      case 0x29:
        return { op: Instr.i64_load, mem: this.readMemArg() } as Instruction;
      case 0x2a:
        return { op: Instr.f32_load, mem: this.readMemArg() } as Instruction;
      case 0x2b:
        return { op: Instr.f64_load, mem: this.readMemArg() } as Instruction;
      case 0x2c:
        return { op: Instr.i32_load8_s, mem: this.readMemArg() } as Instruction;
      case 0x2d:
        return { op: Instr.i32_load8_u, mem: this.readMemArg() } as Instruction;
      case 0x2e:
        return {
          op: Instr.i32_load16_s,
          mem: this.readMemArg(),
        } as Instruction;
      case 0x2f:
        return {
          op: Instr.i32_load16_u,
          mem: this.readMemArg(),
        } as Instruction;
      case 0x30:
        return { op: Instr.i64_load8_s, mem: this.readMemArg() } as Instruction;
      case 0x31:
        return { op: Instr.i64_load8_u, mem: this.readMemArg() } as Instruction;
      case 0x32:
        return {
          op: Instr.i64_load16_s,
          mem: this.readMemArg(),
        } as Instruction;
      case 0x33:
        return {
          op: Instr.i64_load16_u,
          mem: this.readMemArg(),
        } as Instruction;
      case 0x34:
        return {
          op: Instr.i64_load32_s,
          mem: this.readMemArg(),
        } as Instruction;
      case 0x35:
        return {
          op: Instr.i64_load32_u,
          mem: this.readMemArg(),
        } as Instruction;
      case 0x36:
        return { op: Instr.i32_store, mem: this.readMemArg() } as Instruction;
      case 0x37:
        return { op: Instr.i64_store, mem: this.readMemArg() } as Instruction;
      case 0x38:
        return { op: Instr.f32_store, mem: this.readMemArg() } as Instruction;
      case 0x39:
        return { op: Instr.f64_store, mem: this.readMemArg() } as Instruction;
      case 0x3a:
        return { op: Instr.i32_store8, mem: this.readMemArg() } as Instruction;
      case 0x3b:
        return { op: Instr.i32_store16, mem: this.readMemArg() } as Instruction;
      case 0x3c:
        return { op: Instr.i64_store8, mem: this.readMemArg() } as Instruction;
      case 0x3d:
        return { op: Instr.i64_store16, mem: this.readMemArg() } as Instruction;
      case 0x3e:
        return { op: Instr.i64_store32, mem: this.readMemArg() } as Instruction;

      case 0x41:
        return { op: Instr.i32_const, n: this.r.readUint() } as Instruction;
      case 0x42:
        return { op: Instr.i64_const, n: this.r.readUint() } as Instruction;
      case 0x43:
        return { op: Instr.f32_const, z: this.r.readF32() } as Instruction;
      case 0x44:
        return { op: Instr.f64_const, z: this.r.readF64() } as Instruction;

      case 0x45:
        return { op: Instr.i32_eqz };
      case 0x46:
        return { op: Instr.i32_eq };
      case 0x47:
        return { op: Instr.i32_ne };
      case 0x48:
        return { op: Instr.i32_lt_s };
      case 0x49:
        return { op: Instr.i32_lt_u };
      case 0x4a:
        return { op: Instr.i32_gt_s };
      case 0x4b:
        return { op: Instr.i32_gt_u };
      case 0x4c:
        return { op: Instr.i32_le_s };
      case 0x4d:
        return { op: Instr.i32_le_u };
      case 0x4e:
        return { op: Instr.i32_ge_s };
      case 0x4f:
        return { op: Instr.i32_ge_u };
      case 0x50:
        return { op: Instr.i64_eqz };
      case 0x51:
        return { op: Instr.i64_eq };
      case 0x52:
        return { op: Instr.i64_ne };
      case 0x53:
        return { op: Instr.i64_lt_s };
      case 0x54:
        return { op: Instr.i64_lt_u };
      case 0x55:
        return { op: Instr.i64_gt_s };
      case 0x56:
        return { op: Instr.i64_gt_u };
      case 0x57:
        return { op: Instr.i64_le_s };
      case 0x58:
        return { op: Instr.i64_le_u };
      case 0x59:
        return { op: Instr.i64_ge_s };
      case 0x5a:
        return { op: Instr.i64_ge_u };
      case 0x5b:
        return { op: Instr.f32_eq };
      case 0x5c:
        return { op: Instr.f32_ne };
      case 0x5d:
        return { op: Instr.f32_lt };
      case 0x5e:
        return { op: Instr.f32_gt };
      case 0x5f:
        return { op: Instr.f32_le };
      case 0x60:
        return { op: Instr.f32_ge };
      case 0x61:
        return { op: Instr.f64_eq };
      case 0x62:
        return { op: Instr.f64_ne };
      case 0x63:
        return { op: Instr.f64_lt };
      case 0x64:
        return { op: Instr.f64_gt };
      case 0x65:
        return { op: Instr.f64_le };
      case 0x66:
        return { op: Instr.f64_ge };
      case 0x67:
        return { op: Instr.i32_clz };
      case 0x68:
        return { op: Instr.i32_ctz };
      case 0x69:
        return { op: Instr.i32_popcnt };
      case 0x6a:
        return { op: Instr.i32_add };
      case 0x6b:
        return { op: Instr.i32_sub };
      case 0x6c:
        return { op: Instr.i32_mul };
      case 0x6d:
        return { op: Instr.i32_div_s };
      case 0x6e:
        return { op: Instr.i32_div_u };
      case 0x6f:
        return { op: Instr.i32_rem_s };
      case 0x70:
        return { op: Instr.i32_rem_u };
      case 0x71:
        return { op: Instr.i32_and };
      case 0x72:
        return { op: Instr.i32_or };
      case 0x73:
        return { op: Instr.i32_xor };
      case 0x74:
        return { op: Instr.i32_shl };
      case 0x75:
        return { op: Instr.i32_shr_s };
      case 0x76:
        return { op: Instr.i32_shr_u };
      case 0x77:
        return { op: Instr.i32_rotl };
      case 0x78:
        return { op: Instr.i32_rotr };
      case 0x79:
        return { op: Instr.i64_clz };
      case 0x7a:
        return { op: Instr.i64_ctz };
      case 0x7b:
        return { op: Instr.i64_popcnt };
      case 0x7c:
        return { op: Instr.i64_add };
      case 0x7d:
        return { op: Instr.i64_sub };
      case 0x7e:
        return { op: Instr.i64_mul };
      case 0x7f:
        return { op: Instr.i64_div_s };
      case 0x80:
        return { op: Instr.i64_div_u };
      case 0x81:
        return { op: Instr.i64_rem_s };
      case 0x82:
        return { op: Instr.i64_rem_u };
      case 0x83:
        return { op: Instr.i64_and };
      case 0x84:
        return { op: Instr.i64_or };
      case 0x85:
        return { op: Instr.i64_xor };
      case 0x86:
        return { op: Instr.i64_shl };
      case 0x87:
        return { op: Instr.i64_shr_s };
      case 0x88:
        return { op: Instr.i64_shr_u };
      case 0x89:
        return { op: Instr.i64_rotl };
      case 0x8a:
        return { op: Instr.i64_rotr };
      case 0x8b:
        return { op: Instr.f32_abs };
      case 0x8c:
        return { op: Instr.f32_neg };
      case 0x8d:
        return { op: Instr.f32_ceil };
      case 0x8e:
        return { op: Instr.f32_floor };
      case 0x8f:
        return { op: Instr.f32_trunc };
      case 0x90:
        return { op: Instr.f32_nearest };
      case 0x91:
        return { op: Instr.f32_sqrt };
      case 0x92:
        return { op: Instr.f32_add };
      case 0x93:
        return { op: Instr.f32_sub };
      case 0x94:
        return { op: Instr.f32_mul };
      case 0x95:
        return { op: Instr.f32_div };
      case 0x96:
        return { op: Instr.f32_min };
      case 0x97:
        return { op: Instr.f32_max };
      case 0x98:
        return { op: Instr.f32_copysign };
      case 0x99:
        return { op: Instr.f64_abs };
      case 0x9a:
        return { op: Instr.f64_neg };
      case 0x9b:
        return { op: Instr.f64_ceil };
      case 0x9c:
        return { op: Instr.f64_floor };
      case 0x9d:
        return { op: Instr.f64_trunc };
      case 0x9e:
        return { op: Instr.f64_nearest };
      case 0x9f:
        return { op: Instr.f64_sqrt };
      case 0xa0:
        return { op: Instr.f64_add };
      case 0xa1:
        return { op: Instr.f64_sub };
      case 0xa2:
        return { op: Instr.f64_mul };
      case 0xa3:
        return { op: Instr.f64_div };
      case 0xa4:
        return { op: Instr.f64_min };
      case 0xa5:
        return { op: Instr.f64_max };
      case 0xa6:
        return { op: Instr.f64_copysign };
      case 0xa7:
        return { op: Instr.i32_wrap_i64 };
      case 0xa8:
        return { op: Instr.i32_trunc_f32_s };
      case 0xa9:
        return { op: Instr.i32_trunc_f32_u };
      case 0xaa:
        return { op: Instr.i32_trunc_f64_s };
      case 0xab:
        return { op: Instr.i32_trunc_f64_u };
      case 0xac:
        return { op: Instr.i64_extend_i32_s };
      case 0xad:
        return { op: Instr.i64_extend_i32_u };
      case 0xae:
        return { op: Instr.i64_trunc_f32_s };
      case 0xaf:
        return { op: Instr.i64_trunc_f32_u };
      case 0xb0:
        return { op: Instr.i64_trunc_f64_s };
      case 0xb1:
        return { op: Instr.i64_trunc_f64_u };
      case 0xb2:
        return { op: Instr.f32_convert_i32_s };
      case 0xb3:
        return { op: Instr.f32_convert_i32_u };
      case 0xb4:
        return { op: Instr.f32_convert_i64_s };
      case 0xb5:
        return { op: Instr.f32_convert_i64_u };
      case 0xb6:
        return { op: Instr.f32_demote_f64 };
      case 0xb7:
        return { op: Instr.f64_convert_i32_s };
      case 0xb8:
        return { op: Instr.f64_convert_i32_u };
      case 0xb9:
        return { op: Instr.f64_convert_i64_s };
      case 0xba:
        return { op: Instr.f64_convert_i64_u };
      case 0xbb:
        return { op: Instr.f64_promote_f32 };
      case 0xbc:
        return { op: Instr.i32_reinterpret_f32 };
      case 0xbd:
        return { op: Instr.i64_reinterpret_f64 };
      case 0xbe:
        return { op: Instr.f32_reinterpret_i32 };
      case 0xbf:
        return { op: Instr.f64_reinterpret_i64 };
      case 0xc0:
        return { op: Instr.i32_extend8_s };
      case 0xc1:
        return { op: Instr.i32_extend16_s };
      case 0xc2:
        return { op: Instr.i64_extend8_s };
      case 0xc3:
        return { op: Instr.i64_extend16_s };
      case 0xc4:
        return { op: Instr.i64_extend32_s };

      default:
        throw new Error(`unhandled op ${op.toString(16)}`);
    }
  }

  readInstrs(): [Array<Instruction>, Instr] {
    const instrs: Array<Instruction> = [];
    while (true) {
      const instr = this.readInstruction();
      console.log(instr);
      if (instr.op === Instr.end || instr.op === Instr.else) {
        return [instrs, instr.op];
      }
      instrs.push(instr);
    }
  }

  readExpr() {
    return this.readInstrs()[0];
  }

  readFunc() {
    const locals: Type[] = [];
    const len = this.r.readUint();
    for (let i = 0; i < len; i++) {
      const count = this.r.readUint();
      const type = this.readValType();
      for (let j = 0; j < count; j++) {
        locals.push(type);
      }
    }
    console.log('locals', locals);
    this.readExpr();
  }

  readCode() {
    const len = this.r.readUint();
    for (let i = 0; i < len; i++) {
      const size = this.r.readUint();
      this.readFunc();
    }
  }

  readSection() {
    const id = this.r.read8();
    const len = this.r.readUint();
    switch (id) {
      case 10:
        this.readCode();
        break;
      default:
        this.r.skip(len);
    }
    console.log(id, len);
  }

  read() {
    this.readHeader();
    while (!this.r.done()) {
      this.readSection();
    }
  }
}

const file = fs.readFileSync('t.wasm');
const buf = file.buffer.slice(
  file.byteOffset,
  file.byteOffset + file.byteLength
);
const r = new Parser(new Reader(buf));
r.read();
