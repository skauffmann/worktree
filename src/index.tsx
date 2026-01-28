#!/usr/bin/env bun
import React from 'react';
import { render } from 'ink';
import { App } from './app.tsx';

const branchName = process.argv[2] || null;

render(<App initialBranchName={branchName} />);
