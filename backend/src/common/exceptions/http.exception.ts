import { HttpException, HttpStatus } from '@nestjs/common';

export class SuccessException extends HttpException {
    constructor(data: any, message: string = 'Success', statusCode: number = HttpStatus.OK) {
        super(
            {
                status: true,
                message,
                data,
            },
            statusCode,
        );
    }
}

export class ErrorException extends HttpException {
    constructor(message: string, errors: any = null, statusCode: number = HttpStatus.BAD_REQUEST) {
        super(
            {
                status: false,
                message,
                errors,
            },
            statusCode,
        );
    }
}

export class ValidationException extends HttpException {
    constructor(errors: any, message: string = 'Validation failed') {
        super(
            {
                status: false,
                message,
                errors,
            },
            HttpStatus.UNPROCESSABLE_ENTITY,
        );
    }
}

export class NotFoundException extends HttpException {
    constructor(message: string = 'Resource not found') {
        super(
            {
                status: false,
                message,
                errors: null,
            },
            HttpStatus.NOT_FOUND,
        );
    }
}

export class ConflictException extends HttpException {
    constructor(message: string = 'Resource already exists') {
        super(
            {
                status: false,
                message,
                errors: null,
            },
            HttpStatus.CONFLICT,
        );
    }
}

export class UnauthorizedException extends HttpException {
    constructor(message: string = 'Unauthorized') {
        super(
            {
                status: false,
                message,
                errors: null,
            },
            HttpStatus.UNAUTHORIZED,
        );
    }
}

export class ForbiddenException extends HttpException {
    constructor(message: string = 'Forbidden') {
        super(
            {
                status: false,
                message,
                errors: null,
            },
            HttpStatus.FORBIDDEN,
        );
    }
}
