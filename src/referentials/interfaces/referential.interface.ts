import { Referential, Session, Learner, Coach, Module } from '@prisma/client';

export interface ReferentialWithRelations extends Referential {
  sessions?: Session[];
  learners?: Learner[];
  coaches?: Coach[];
  modules?: Module[];
}

export interface PublicReferentialModule {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  startDate: Date;
  endDate: Date;
}

export interface PublicReferential {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  capacity: number;
  attendanceClosedAt: Date | null;
  modules: PublicReferentialModule[];
}
