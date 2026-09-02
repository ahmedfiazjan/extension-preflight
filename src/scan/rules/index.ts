import type { Rule } from '../types'
import { manifestMissing } from './manifest-missing'
import { manifestInvalid } from './manifest-invalid'
import { missingReferencedFile } from './missing-referenced-file'
import { broadHostPermissions } from './broad-host-permissions'
import { redundantPermission } from './redundant-permission'
import { unusedPermission } from './unused-permission'
import { cspInvalid } from './csp-invalid'
import { remoteScript } from './remote-script'
import { obfuscatedCode } from './obfuscated-code'

export const rules: Rule[] = [
  manifestMissing,
  manifestInvalid,
  missingReferencedFile,
  broadHostPermissions,
  redundantPermission,
  unusedPermission,
  cspInvalid,
  remoteScript,
  obfuscatedCode,
]
