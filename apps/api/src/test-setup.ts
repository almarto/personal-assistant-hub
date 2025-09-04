// Global test setup for Jest
// This file handles cleanup of database connections and other resources

import { TestingModule } from '@nestjs/testing';

// Store all TestingModule instances to close them later
const testingModules: TestingModule[] = [];

// Override Test.createTestingModule to track modules
const originalCreateTestingModule =
  require('@nestjs/testing').Test.createTestingModule;
require('@nestjs/testing').Test.createTestingModule = function (metadata: any) {
  const moduleBuilder = originalCreateTestingModule.call(this, metadata);
  const originalCompile = moduleBuilder.compile;

  moduleBuilder.compile = async function () {
    const module = await originalCompile.call(this);
    testingModules.push(module);
    return module;
  };

  return moduleBuilder;
};

// Global cleanup after all tests
afterAll(async () => {
  // Close all TestingModule instances
  for (const module of testingModules) {
    try {
      await module.close();
    } catch {
      // Ignore errors during cleanup
    }
  }

  // Clear the array
  testingModules.length = 0;

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Wait a bit for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});
