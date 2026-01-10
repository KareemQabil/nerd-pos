// Users Module
// Source: FINAL/BACKEND/14-MODULE-USERS-ROLES.md

import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

@Module({
    controllers: [UsersController],
    providers: [UsersService, UsersRepository],
    exports: [UsersService],
})
export class UsersModule { }
