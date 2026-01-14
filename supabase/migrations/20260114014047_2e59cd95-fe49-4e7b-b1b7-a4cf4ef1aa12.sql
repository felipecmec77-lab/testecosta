-- Add missing values to motivo_perda_geral enum
ALTER TYPE motivo_perda_geral ADD VALUE IF NOT EXISTS 'limpeza';
ALTER TYPE motivo_perda_geral ADD VALUE IF NOT EXISTS 'manutencao';
ALTER TYPE motivo_perda_geral ADD VALUE IF NOT EXISTS 'escritorio';
ALTER TYPE motivo_perda_geral ADD VALUE IF NOT EXISTS 'alimentacao';