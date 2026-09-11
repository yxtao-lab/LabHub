import { Router } from 'express';
import {
  addCategory,
  addCategorySchema,
  deleteCategory,
  listCategories,
  updateCategory,
  updateCategorySchema,
} from '../categories-service.js';

export const categoriesRouter = Router();

/**
 * GET /api/categories — 分类列表
 */
categoriesRouter.get('/', (_req, res, next) => {
  try {
    res.json({ categories: listCategories() });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/categories — 新建分类
 */
categoriesRouter.post('/', async (req, res, next) => {
  try {
    const parsed = addCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const category = await addCategory(parsed.data);
    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/categories/:id — 更新分类
 */
categoriesRouter.patch('/:id', async (req, res, next) => {
  try {
    const parsed = updateCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const category = await updateCategory(req.params.id, parsed.data);
    res.json({ category });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/categories/:id — 删除分类
 */
categoriesRouter.delete('/:id', async (req, res, next) => {
  try {
    await deleteCategory(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});
