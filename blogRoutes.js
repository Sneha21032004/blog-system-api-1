import express from 'express';
import db from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

function calculateReadTime(content) {
  const wordCount = content.split(' ').length;
  return `${Math.ceil(wordCount / 200)} min read`;
}
router.post('/', verifyToken, async (req, res) => {
  const {
    title = null,
    content = null,
    author = null,
    tags = null,
    category = null
  } = req.body;

  const user_id = req.user?.user_id || null;
  const read_time = content ? calculateReadTime(content) : null;

  if (!title || !content || !author) {
    return res.status(400).json({ message: 'Title, content, and author are required' });
  }

  try {
    await db.execute(
      `INSERT INTO blogs (title, content, author, tags, category, read_time, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, content, author, tags, category, read_time, user_id]
    );

    res.status(201).json({ message: 'Blog created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



router.get('/', async (req, res) => {
  const { page, limit } = req.query;

  try {
    let blogs;
    if (page && limit) {
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const [result] = await db.execute(
        'SELECT * FROM blogs ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [parseInt(limit), offset]
      );
      blogs = result;
    } else {

      const [result] = await db.execute(
        'SELECT * FROM blogs ORDER BY created_at DESC'
      );
      blogs = result;
    }

    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  const blogId = req.params.id;

  try {
    await db.execute('UPDATE blogs SET views = views + 1 WHERE id = ?', [blogId]);

    const [rows] = await db.execute('SELECT * FROM blogs WHERE id = ?', [blogId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  const { title, content, tags, category } = req.body;
  const blogId = req.params.id;
  const user_id = req.user.user_id;

  try {
    const [rows] = await db.execute('SELECT * FROM blogs WHERE id = ?', [blogId]);
    if (rows.length === 0) return res.status(404).json({ message: 'Blog not found' });

    const blog = rows[0];
    if (blog.user_id !== user_id) {
      return res.status(403).json({ message: 'Unauthorized: Not your blog' });
    }

    await db.execute(
      'UPDATE blogs SET title = ?, content = ?, tags = ?, category = ? WHERE id = ?',
      [title, content, tags, category, blogId]
    );
    res.json({ message: 'Blog updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.delete('/:id', verifyToken, async (req, res) => {
  const blogId = req.params.id;
  const user_id = req.user.user_id;

  try {
    const [rows] = await db.execute('SELECT * FROM blogs WHERE id = ?', [blogId]);
    if (rows.length === 0) return res.status(404).json({ message: 'Blog not found' });

    const blog = rows[0];
    if (blog.user_id !== user_id) {
      return res.status(403).json({ message: 'Unauthorized: Not your blog' });
    }

    await db.execute('DELETE FROM blogs WHERE id = ?', [blogId]);
    res.json({ message: 'Blog deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
