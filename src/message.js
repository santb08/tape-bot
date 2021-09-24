class Message {
    constructor(message, type) {
        this.title = message.title;
        this.description = message.description;
        // this.fields = message.fields;
        this.timestamp = message.timestamp;

        return this.toString();
    }

    toString() {
        return ({
            content: 'Hey there!',
            embeds: [{
                title: this.title,
                description: this.description,
                color: 16566691,
                fields: [{
                    name: 'Author\'s GitHub page',
                    value: '@tortutales'
                }],
                timestamp: this.timestamp
            }]
        });
    }
}

module.exports = Message;