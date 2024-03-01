const express = require('express');
const app = express();
const pg = require('pg');
const morgan = require('morgan');
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(morgan('dev'));

const client = new pg.Client(process.env.DATABASE_URL || 'postgres://localhost/acme_hr_directory');

const init = async () => {
    await client.connect();
    console.log('Connected to database');

    try {
        await client.query(`
            -- Create departments table
            CREATE TABLE IF NOT EXISTS departments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL
            );

            -- Create employees table
            CREATE TABLE IF NOT EXISTS employees (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                department_id INTEGER REFERENCES departments(id)
            );

            -- Seed departments
            INSERT INTO departments (name) VALUES ('HR'), ('Finance'), ('IT') ON CONFLICT DO NOTHING;

            -- Seed employees
            INSERT INTO employees (name, department_id) VALUES ('John Doe', 1), ('Jane Smith', 2), ('Mike Johnson', 3) ON CONFLICT DO NOTHING;
        `);
        console.log('Database tables created and seeded');
    } catch (error) {
        console.error('Error initializing database:', error);
    }

    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
};

init();


app.get('/api/employees', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM employees');
        res.json(result.rows);
    } catch (error) {
        console.error('Error getting employees:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/departments', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM departments');
        res.json(result.rows);
    } catch (error) {
        console.error('Error getting departments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/employees', async (req, res) => {
    const { name, department_id } = req.body;
    try {
        const result = await client.query('INSERT INTO employees (name, department_id) VALUES ($1, $2) RETURNING *', [name, department_id]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/employees/:id', async (req, res) => {
    const { id } = req.params;
    const { name, department_id } = req.body;
    try {
        const result = await client.query('UPDATE employees SET name=$1, department_id=$2 WHERE id=$3 RETURNING *', [name, department_id, id]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/employees/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await client.query('DELETE FROM employees WHERE id=$1', [id]);
        res.sendStatus(204);
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});
