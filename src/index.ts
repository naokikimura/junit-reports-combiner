#!/usr/bin/env node

import execute from './cli';

execute(process.argv, process.stdin, process.stdout)
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
