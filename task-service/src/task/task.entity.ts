import { TaskStatus } from '../enums/TaskStatus';
export interface Task {
  location: string;
  status: TaskStatus;
}

// create update, delete işlemlerinde loglama yapılıyor mu ?

// frontend
// structure create,update, delete
// task create,update, delete
// task kanban board (en sonunda yapılacak)
