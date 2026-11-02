# Revisão do catálogo — Lista de exercícios fornecida

Foram conferidos 72 nomes, sem repetições literais dentro da lista.

- 11 já existiam com o mesmo nome (desconsiderando maiúsculas).
- 13 correspondem a entradas existentes com outro nome ou detalhamento.
- 48 variações foram adicionadas, elevando o catálogo de 46 para 94 exercícios.

## Critérios

Os grupos representam uma categoria principal de organização, não os únicos músculos
participantes. Os novos filtros incluem Antebraços, Adutores, Lombar e Trapézio.
A classificação de regiões segue como referência a [biblioteca de exercícios da ACE](https://www.acefitness.org/resources/everyone/exercise-library/)
e sua [listagem de remadas, encolhimentos e exercícios de punho](https://www.acefitness.org/resources/everyone/exercise-library/equipment/dumbbells/?page=3).
As equivalências de nomes em português abaixo são decisões de curadoria do catálogo.

- Os IDs e nomes antigos foram preservados. Sinônimos foram incluídos em `search_text`,
  portanto a busca encontra, por exemplo, “serrote”, “tradicional” e “45°”.
- Remada serrote corresponde à remada unilateral com halter; rosca martelo com
  halteres e tríceps com corda reaproveitam os itens cujo equipamento já era explícito.
- “Crucifixo reto com halteres” e “crucifixo reto na máquina” foram tratados como os
  movimentos básicos já cadastrados. O nome anterior permanece visível no catálogo.
- Entradas genéricas sem pegada ou variante definida foram preservadas sem adivinhar
  a execução: puxada frontal, remada baixa, barra fixa, rosca direta com barra,
  tríceps na polia, face pull, glúteo na polia e cadeira extensora continuam existindo.
  As variações específicas solicitadas ganham itens próprios.
- Stiff e terra romeno continuam separados, assim como polias alta/média/baixa,
  pegadas diferentes, Smith, máquinas articuladas e execução unilateral/bilateral.
- Agachamento búlgaro recebeu equipamento “Não especificado”, pois a lista não indica
  se utiliza peso corporal, halteres ou barra. Remada cavalinho foi categorizada na
  versão com barra; a máquina específica pode ser cadastrada como outra variação.
- Exercícios antigos fora da lista não foram excluídos. Treinos e snapshots históricos
  não são renomeados. A migration `0006` instala o mesmo catálogo para todas as contas.

## Conferência completa

| Nome fornecido | Nome no catálogo | Grupo principal | Equipamento | Decisão |
|---|---|---|---|---|
| Supino reto com barra | Supino reto com barra | Peito | Barra | Já existente |
| Supino reto com halteres | Supino reto com halteres | Peito | Halteres | Já existente |
| Supino reto na máquina | Supino reto na máquina | Peito | Máquina | Novo |
| Supino reto no Smith | Supino reto no Smith | Peito | Smith | Novo |
| Supino reto articulado | Supino reto articulado | Peito | Máquina | Novo |
| Supino inclinado com barra | Supino inclinado com barra | Peito | Barra | Já existente |
| Supino inclinado com halteres | Supino inclinado com halteres | Peito | Halteres | Já existente |
| Supino inclinado no Smith | Supino inclinado no Smith | Peito | Smith | Novo |
| Supino inclinado na máquina | Supino inclinado na máquina | Peito | Máquina | Novo |
| Supino declinado com barra | Supino declinado com barra | Peito | Barra | Novo |
| Crucifixo reto na máquina | Crucifixo na máquina | Peito | Máquina | Equivalente / nome alternativo |
| Crucifixo reto com halteres | Crucifixo com halteres | Peito | Halteres | Equivalente / nome alternativo |
| Crucifixo na polia alta | Crucifixo na polia alta | Peito | Polia | Novo |
| Crucifixo na polia média | Crucifixo na polia média | Peito | Polia | Novo |
| Crucifixo na polia baixa | Crucifixo na polia baixa | Peito | Polia | Novo |
| Flexão de braços tradicional | Flexão de braços | Peito | Peso corporal | Equivalente / nome alternativo |
| Puxada alta pela frente com pegada aberta | Puxada alta pela frente com pegada aberta | Costas | Polia | Novo |
| Puxada alta pela frente com pegada fechada | Puxada alta pela frente com pegada fechada | Costas | Polia | Novo |
| Puxada alta com triângulo | Puxada alta com triângulo | Costas | Polia | Novo |
| Barra fixa pronada | Barra fixa pronada | Costas | Peso corporal | Novo |
| Remada curvada com barra | Remada curvada com barra | Costas | Barra | Já existente |
| Remada Yates | Remada Yates | Costas | Barra | Novo |
| Remada cavalinho (T-Bar Row) | Remada cavalinho (T-Bar Row) | Costas | Barra | Novo |
| Remada serrote | Remada unilateral com halter | Costas | Halteres | Equivalente / nome alternativo |
| Remada baixa com triângulo | Remada baixa com triângulo | Costas | Polia | Novo |
| Remada baixa com barra reta | Remada baixa com barra reta | Costas | Polia | Novo |
| Remada baixa unilateral | Remada baixa unilateral | Costas | Polia | Novo |
| Crucifixo inverso na máquina articulada | Crucifixo inverso na máquina articulada | Ombros | Máquina | Novo |
| Face Pull com corda | Face Pull com corda | Ombros | Polia | Novo |
| Rosca direta com barra reta | Rosca direta com barra reta | Bíceps | Barra | Novo |
| Rosca direta com barra W | Rosca direta com barra W | Bíceps | Barra | Novo |
| Rosca Scott na máquina | Rosca Scott na máquina | Bíceps | Máquina | Já existente |
| Rosca Scott com halteres | Rosca Scott com halteres | Bíceps | Halteres | Novo |
| Rosca inclinada com halteres | Rosca inclinada com halteres | Bíceps | Halteres | Novo |
| Rosca martelo com halteres | Rosca martelo | Bíceps | Halteres | Equivalente / nome alternativo |
| Tríceps pulley com barra reta | Tríceps pulley com barra reta | Tríceps | Polia | Novo |
| Tríceps pulley com barra W | Tríceps pulley com barra W | Tríceps | Polia | Novo |
| Tríceps pulley com corda | Tríceps com corda | Tríceps | Polia | Equivalente / nome alternativo |
| Tríceps francês na polia baixa | Tríceps francês na polia baixa | Tríceps | Polia | Novo |
| Tríceps francês com halter | Tríceps francês | Tríceps | Halteres | Equivalente / nome alternativo |
| Tríceps testa com halteres | Tríceps testa com halteres | Tríceps | Halteres | Novo |
| Flexão de punho com barra | Flexão de punho com barra | Antebraços | Barra | Novo |
| Extensão de punho com barra | Extensão de punho com barra | Antebraços | Barra | Novo |
| Agachamento livre com barra | Agachamento livre | Quadríceps | Barra | Equivalente / nome alternativo |
| Agachamento no Smith | Agachamento no Smith | Quadríceps | Smith | Novo |
| Agachamento no Hack | Agachamento hack | Quadríceps | Máquina | Equivalente / nome alternativo |
| Agachamento no Pendulum Squat | Agachamento no Pendulum Squat | Quadríceps | Máquina | Novo |
| Leg Press 45° | Leg press 45 graus | Quadríceps | Máquina | Equivalente / nome alternativo |
| Leg Press horizontal | Leg Press horizontal | Quadríceps | Máquina | Novo |
| Leg Press vertical | Leg Press vertical | Quadríceps | Máquina | Novo |
| Leg Press articulado | Leg Press articulado | Quadríceps | Máquina | Novo |
| Cadeira extensora bilateral | Cadeira extensora bilateral | Quadríceps | Máquina | Novo |
| Cadeira extensora unilateral | Cadeira extensora unilateral | Quadríceps | Máquina | Novo |
| Afundo com halteres | Afundo com halteres | Quadríceps | Halteres | Já existente |
| Afundo com barra | Afundo com barra | Quadríceps | Barra | Novo |
| Agachamento búlgaro | Agachamento búlgaro | Quadríceps | Não especificado | Novo |
| Mesa flexora deitada | Mesa flexora | Posteriores de coxa | Máquina | Equivalente / nome alternativo |
| Cadeira flexora sentada | Cadeira flexora | Posteriores de coxa | Máquina | Equivalente / nome alternativo |
| Flexora em pé unilateral | Flexora em pé unilateral | Posteriores de coxa | Máquina | Novo |
| Stiff com barra | Stiff com barra | Posteriores de coxa | Barra | Já existente |
| Stiff com halteres | Stiff com halteres | Posteriores de coxa | Halteres | Já existente |
| Terra romeno com barra | Terra romeno com barra | Posteriores de coxa | Barra | Novo |
| Coice de glúteo na polia | Coice de glúteo na polia | Glúteos | Polia | Novo |
| Coice de glúteo na máquina | Coice de glúteo na máquina | Glúteos | Máquina | Novo |
| Cadeira abdutora | Cadeira abdutora | Glúteos | Máquina | Já existente |
| Cadeira adutora | Cadeira adutora | Adutores | Máquina | Novo |
| Panturrilha em pé na máquina | Panturrilha em pé na máquina | Panturrilhas | Máquina | Já existente |
| Panturrilha no Leg Press 45° | Panturrilha no Leg Press 45° | Panturrilhas | Máquina | Novo |
| Panturrilha sentado na máquina | Panturrilha sentado | Panturrilhas | Máquina | Equivalente / nome alternativo |
| Extensão lombar no banco romano | Extensão lombar no banco romano | Lombar | Banco romano | Novo |
| Encolhimento com barra | Encolhimento com barra | Trapézio | Barra | Novo |
| Encolhimento com halteres | Encolhimento com halteres | Trapézio | Halteres | Novo |

## Verificação técnica

- Migration `0006`: 48 inserções e 13 atualizações apenas no texto de busca.
- IDs, nomes e categorias das 46 entradas antigas permanecem inalterados.
- 91 testes de backend aprovados, incluindo a busca de todos os novos nomes e sinônimos.
- Quatro testes de integração com PostgreSQL e imagem estática aprovados em desktop e mobile.
- O catálogo continua global e exercícios manuais continuam privados.
