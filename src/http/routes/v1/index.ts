import { Router } from 'express'

const v1Router = Router()

v1Router.get('/', (_req, res) => {
	res.json({ message: 'Dashboard API v1 root' })
})

export { v1Router }
