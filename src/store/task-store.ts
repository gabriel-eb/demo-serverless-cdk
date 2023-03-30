// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Task } from "../model/Task";

export interface TaskStore {
  getTask: (id: string) => Promise<Task | undefined>;
  putTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  getTasks: () => Promise<Task[] | undefined>;
}
