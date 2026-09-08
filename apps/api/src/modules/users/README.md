User management (list/invite/deactivate, Doc 06.12 §2) is not implemented
in this slice — the seed script creates users directly. Follow Doc 12's
module shape (controller/service/repository/routes/validation) when
building this out; requireRole("ADMINISTRATOR") from
../../middleware/permissions should gate all of it per Doc 06.12.
