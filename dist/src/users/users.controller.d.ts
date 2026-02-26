import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.UserRole;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.UserRole;
    }>;
    getUserPhoto(email: string): Promise<{
        photoUrl: string | null;
    }>;
    getUserByEmail(email: string): Promise<{
        details: {
            id: string;
            firstName: string;
            lastName: string;
            phone: string | null;
            photoUrl: string | null;
            userId: string;
            createdAt: Date;
            updatedAt: Date;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.UserRole;
    }>;
}
