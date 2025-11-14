import { Referential, Session, Learner, Coach, Module } from '@prisma/client';

export interface ReferentialWithRelations extends Referential {
  sessions?: Session[];
  learners?: Learner[];
  coaches?: Coach[];
  modules?: Module[];
}