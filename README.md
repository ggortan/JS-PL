# JS-PL

Aplicação web para modelagem e resolução de problemas de **Programação Linear (PL)**, também conhecida como otimização linear. O sistema permite definir uma função objetivo, informar restrições e comparar a resolução pelos métodos **Gráfico** e **Simplex**.

## Acesso

- **Aplicação online:** [ggortan.github.io/JS-PL](https://ggortan.github.io/JS-PL/)
- **Repositório:** [github.com/ggortan/JS-PL](https://github.com/ggortan/JS-PL)

## Integrantes

- Gabriel Cattini Gortan
- Rafael Vaccari
- Vitor Vendrame Campeão

## Funcionalidades

- Definição da quantidade de variáveis de decisão e restrições.
- Escolha entre maximização e minimização da função objetivo.
- Entrada de coeficientes, operadores `≤`, `≥` ou `=` e valores das restrições.
- Resolução pelo Método Gráfico para problemas com exatamente duas variáveis.
- Resolução pelo método Simplex quando o modelo atende às condições suportadas pela aplicação.
- Carregamento de um problema de exemplo.
- Exibição do modelo informado, da solução encontrada e do valor da função objetivo.
- Visualização da região factível, dos vértices e dos resultados no gráfico.
- Exibição das etapas do Simplex em tabelas para facilitar o acompanhamento do cálculo.
- Interface responsiva para uso em diferentes tamanhos de tela.

## Tecnologias utilizadas

- **HTML5:** estrutura da aplicação.
- **CSS3:** estilos e ajustes visuais.
- **JavaScript:** geração dinâmica dos formulários, validações, cálculos e resolução dos modelos.
- **Bootstrap 5:** componentes, organização e responsividade da interface.
- **Canvas 2D:** renderização interativa do gráfico da região factível e dos vértices.

A aplicação é executada totalmente no navegador, sem necessidade de servidor de processamento ou banco de dados.

## Como utilizar

1. Acesse a [aplicação online](https://ggortan.github.io/JS-PL/).
2. Informe a quantidade de variáveis e restrições.
3. Selecione **Maximizar** ou **Minimizar**.
4. Clique em **Gerar campos**.
5. Preencha os coeficientes da função objetivo e das restrições.
6. Selecione os métodos desejados.
7. Clique em **Resolver métodos selecionados**.

Para testar rapidamente a aplicação, utilize o botão **Carregar exemplo**.

## Exemplo de modelo

O exemplo carregado pela aplicação corresponde ao seguinte problema:

```text
Maximizar Z = 3x₁ + 5x₂

Sujeito a:
x₁              ≤ 4
       2x₂       ≤ 12
3x₁ + 2x₂       ≤ 18
x₁, x₂ ≥ 0
```

## Organização do projeto

```text
JS-PL/
├── index.html   # Estrutura da interface
├── styles.css   # Estilos da aplicação
├── script.js    # Lógica, cálculos e renderização
└── README.md    # Documentação do projeto
```

## Softwares relacionados

1. **Excel Solver:** suplemento do Microsoft Excel para problemas de pequeno e médio porte utilizando o método Simplex.
2. **PHPSimplex:** ferramenta online que apresenta resoluções pelos métodos Gráfico, Simplex e Duas Fases, incluindo as iterações.
3. **LINGO:** software comercial para construção e resolução de modelos de otimização linear e não linear.

## Licença

Este projeto foi desenvolvido para fins acadêmicos. Consulte os integrantes do projeto para informações sobre reutilização e distribuição do código.
