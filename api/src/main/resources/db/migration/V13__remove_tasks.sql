-- V13: pendencias passam a ser so geradas pelo sistema (calculadas a partir de indicators e evidence).
-- Nao ha mais criacao manual, entao a tabela tasks deixa de existir.
-- So aplicar DEPOIS que o codigo nao usar mais a tabela tasks.
DROP TABLE IF EXISTS tasks;
