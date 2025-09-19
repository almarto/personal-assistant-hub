# Absolute Imports Configuration in NestJS

## Current Configuration

The project is already configured to use absolute imports through the configuration in
`tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

## Using Absolute Imports

### ✅ Recommended: Absolute Imports

```typescript
// Instead of long relative imports:
import { Roles } from '../../../../auth/infrastructure/adapters/in/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../auth/infrastructure/adapters/in/guards/jwt-auth.guard';

// Use absolute imports:
import { Roles } from '@/modules/auth/infrastructure/adapters/in/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/adapters/in/guards/jwt-auth.guard';
```

### ✅ Acceptable: Short Relative Imports

```typescript
// For files in the same module or nearby: Maximum to the parent folder of the file
import { UpdateUserDto } from './dto/users.dto';
import { User } from '../domain/model/user.model';
```

## Advantages of Absolute Imports

1. **Readability**: Easier to read and understand
2. **Maintainability**: Don't break when moving files
3. **Consistency**: Same path regardless of where it's imported from
4. **Refactoring**: Easier to refactor

## Usage Rules

- **Use absolute imports** for modules that are 3+ levels away
- **Use relative imports** only for files in the same directory (`./`) or very close
- **Avoid long relative imports** like `../../../../`

## NestJS Compatibility

Absolute imports are **fully compatible and recommended** in NestJS. In fact, they improve the
project architecture by making dependencies between modules more explicit.

## Implemented Example

See the file `src/modules/users/infrastructure/adapters/in/users.controller.ts` as an example of
correct absolute imports implementation.
