export default () => {
    return {
        port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
        database: {
            host: process.env.DB_HOST || 'postgres',
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
            username: process.env.DB_USER || 'nexacall_user',
            password: process.env.DB_PASSWORD || 'nexacall_password',
            database: process.env.DB_NAME || 'nexacall_db',
        },
    };
};