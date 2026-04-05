import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let responseBody: any = {
            status: false,
            message: 'Internal server error',
        };

        if (exception instanceof HttpException) {
            statusCode = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                responseBody.message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object') {
                responseBody = { ...responseBody, ...exceptionResponse };
            }
        } else if (exception instanceof Error) {
            responseBody.message = exception.message;
        }

        // Remove any statusCode from body (keep only in header)
        const { statusCode: _, ...cleanBody } = responseBody;

        response.status(statusCode).json(cleanBody);
    }
}