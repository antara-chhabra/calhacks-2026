import type { Family } from './types.js';
import { polyFamily } from './poly.js';
import { recipLinear } from './recip_linear.js';
import { expLinear } from './exp_linear.js';
import { usubGauss } from './usub_gauss.js';
import { usubLogQuad } from './usub_log_quad.js';
import { sincos } from './sincos.js';
import { partsPolyExp } from './parts_poly_exp.js';
import { partsXTrig } from './parts_x_trig.js';
import { partsLog } from './parts_log.js';
import { trigTan } from './trig_tan.js';
import { partialFrac } from './partial_frac.js';
import { expTrigCyclic } from './exp_trig_cyclic.js';
import { arctanShift } from './arctan_shift.js';
import { secCubed } from './sec_cubed.js';
import { sqrtCircle } from './sqrt_circle.js';
import { xOverX4 } from './x_over_x4.js';
import { logistic } from './logistic.js';

export type { Family, MadeProblem } from './types.js';
export const FAMILIES: readonly Family[] = [
  polyFamily, recipLinear, expLinear,
  usubGauss, usubLogQuad, sincos,
  partsPolyExp, partsXTrig, partsLog, trigTan,
  partialFrac, expTrigCyclic, arctanShift,
  secCubed, sqrtCircle, xOverX4, logistic,
];
export const familiesFor = (d: number): Family[] => FAMILIES.filter((f) => f.difficulty === d);
