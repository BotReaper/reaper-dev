const { RichEmbed } = require('discord.js')
const HexColors = require('./HexColors')

/**
 * A RichEmbed with the default fields already filled
 * @constructor
 * @param {User} [user] - The user that executed the command that resulted in this embed
 * @param {object} [data] - Data to set in the rich embed
 */

module.exports = class Embed extends RichEmbed {
    constructor(author, data = {}) {
        super(data)

        this.setColor(HexColors.defaultColor())
        if (author) this.setFooter(author.tag, author.avatarURL).setTimestamp()
    }

    /**
     * Sets the description of this embed based on an array of arrays of strings
     * @param {Array<Array>} Array containing arrays (blocks) of and strings
     * @returns {Embed}
     */

    setDescriptionFromBlockArray (blocks) {
        this.description = blocks.map(lines => lines.filter(l => !!l).join('\n')).filter(b => !!b.length).join('\n\n')
        return this
    }
}