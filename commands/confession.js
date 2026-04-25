const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('confession')
        .setDescription('Système de confessions anonymes')
        .addSubcommand(subcommand =>
            subcommand
                .setName('send')
                .setDescription('Envoyer une confession anonyme')
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('Votre confession')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Configurer le salon des confessions')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Salon des confessions')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Activer/désactiver les confessions')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'send':
                await sendConfession(interaction);
                break;
            case 'setup':
                await setupConfession(interaction);
                break;
            case 'toggle':
                await toggleConfession(interaction);
                break;
        }
    }
};

async function sendConfession(interaction) {
    const message = interaction.options.getString('message');
    const guild = await database.getGuild(interaction.guild.id);

    if (!guild.confessions.enabled) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Confessions désactivées')
            .setDescription('Les confessions sont désactivées sur ce serveur.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const confessionChannel = interaction.guild.channels.cache.get(guild.confessions.channelId);
    
    if (!confessionChannel) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Salon introuvable')
            .setDescription('Le salon des confessions n\'existe plus.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Vérifier si le message contient du contenu inapproprié (simple filtrage)
    if (containsInappropriateContent(message)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Message inapproprié')
            .setDescription('Votre confession contient du contenu inapproprié et ne peut pas être envoyée.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Ajouter la confession à la base de données
    await database.addConfession(interaction.guild.id, {
        message: message,
        authorId: interaction.user.id,
        guildId: interaction.guild.id,
        status: 'pending'
    });

    // Créer l'embed de la confession
    const confessionEmbed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('💌 Confession Anonyme')
        .setDescription(message)
        .setFooter({
            text: `Confession #${await getConfessionCount(interaction.guild.id)} • Utilisez /confession send pour envoyer la vôtre`,
            iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

    // Ajouter des réactions pour les votes
    const confessionMessage = await confessionChannel.send({ 
        embeds: [confessionEmbed],
        content: '@everyone Nouvelle confession anonyme !'
    });

    await confessionMessage.react('👍');
    await confessionMessage.react('👎');
    await confessionMessage.react('❤️');
    await confessionMessage.react('😂');
    await confessionMessage.react('😢');

    // Mettre à jour le statut de la confession
    await updateConfessionStatus(interaction.guild.id, confessionMessage.id, 'sent');

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Confession envoyée')
        .setDescription('Votre confession anonyme a été envoyée avec succès !')
        .addFields(
            { name: 'Salon', value: `<#${confessionChannel.id}>`, inline: true },
            { name: 'Message ID', value: confessionMessage.id, inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function setupConfession(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Permission refusée')
            .setDescription('Vous n\'avez pas la permission de configurer les confessions.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const channel = interaction.options.getChannel('channel');

    const guild = await database.getGuild(interaction.guild.id);
    guild.confessions = {
        enabled: true,
        channelId: channel.id
    };

    await database.setGuild(interaction.guild.id, guild);

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Configuration des confessions')
        .setDescription('Le système de confessions a été configuré avec succès !')
        .addFields(
            { name: 'Salon des confessions', value: `<#${channel.id}>`, inline: true },
            { name: 'Statut', value: 'Activé', inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function toggleConfession(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Permission refusée')
            .setDescription('Vous n\'avez pas la permission de gérer les confessions.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const guild = await database.getGuild(interaction.guild.id);
    
    if (!guild.confessions.channelId) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Non configuré')
            .setDescription('Veuillez d\'abord configurer le salon des confessions avec /confession setup.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    guild.confessions.enabled = !guild.confessions.enabled;
    await database.setGuild(interaction.guild.id, guild);

    const embed = new EmbedBuilder()
        .setColor(guild.confessions.enabled ? '#00ff00' : '#ff0000')
        .setTitle('✅ Confessions ' + (guild.confessions.enabled ? 'activées' : 'désactivées'))
        .setDescription(`Les confessions sont maintenant ${guild.confessions.enabled ? 'activées' : 'désactivées'} sur ce serveur.`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

function containsInappropriateContent(message) {
    const inappropriateWords = [
        // Liste de mots inappropriés (à adapter selon vos besoins)
        'nazi', 'hitler', 'isis', 'terroriste', 'meurtre', 'suicide',
        // Ajouter d'autres mots selon vos besoins
    ];

    const lowerMessage = message.toLowerCase();
    
    return inappropriateWords.some(word => 
        lowerMessage.includes(word.toLowerCase())
    );
}

async function getConfessionCount(guildId) {
    const confessions = await database.getConfessions(guildId);
    return confessions.length;
}

async function updateConfessionStatus(guildId, messageId, status) {
    const confessions = await database.getConfessions(guildId);
    const confession = confessions.find(c => c.messageId === messageId);
    
    if (confession) {
        confession.status = status;
        confession.sentAt = Date.now();
        await database.writeData('confessions.json', { [guildId]: confessions });
    }
}
