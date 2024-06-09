# Full Stack Serverless -- Chapter 3

### Appsync GraphQL -- Real Time Subscription: AppSync GraphQL Console Test:
`mutation MyMutation {
    createNote(input: {name: "Server DEMOOOOO", description: "test", completed: false}) {
        id
        name
        description
        completed
        clientId
        updatedAt
        createdAt
    }
}`